/**
 * SagaService - Service layer for saga execution
 *
 * Extracts saga coordination logic with dependency injection for testability.
 * Wraps SagaExecutor to provide a service-level interface.
 */

import { SagaExecutor, SagaStep, SagaResult } from '../core/saga-manager';
import { ILogger } from '../infrastructure/logger';

/**
 * ISagaExecutor interface for dependency injection
 */
export interface ISagaExecutor {
  execute(steps: SagaStep[]): Promise<SagaResult>;
  rollback(): Promise<boolean>;
}

/**
 * ISagaService interface for dependency injection
 */
export interface ISagaService {
  /**
   * Execute a saga with rollback on failure
   */
  executeSaga(steps: SagaStep[]): Promise<SagaResult>;

  /**
   * Manually trigger rollback
   */
  triggerRollback(executor: ISagaExecutor): Promise<boolean>;

  /**
   * Validate saga steps before execution
   */
  validateSteps(steps: SagaStep[]): ValidationResult;
}

/**
 * Validation result for saga steps
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * SagaService implementation
 */
export class SagaService implements ISagaService {
  constructor(
    private logger: ILogger,
    private workspaceDir: string
  ) {}

  async executeSaga(steps: SagaStep[]): Promise<SagaResult> {
    this.logger.info('Starting saga execution', {
      stepCount: steps.length,
      steps: steps.map(s => s.name),
    });

    // Validate steps before execution
    const validation = this.validateSteps(steps);
    if (!validation.valid) {
      this.logger.error('Saga validation failed', { errors: validation.errors });
      throw new Error(`Saga validation failed: ${validation.errors.join(', ')}`);
    }

    // Create executor and run saga
    const executor = new SagaExecutor(this.workspaceDir);

    try {
      const result = await executor.execute(steps);

      if (result.success) {
        this.logger.info('Saga completed successfully', {
          completedSteps: result.completedSteps,
        });
      } else {
        this.logger.error('Saga failed', {
          failedStep: result.failedStep,
          error: result.error?.message,
          rollbackPerformed: result.rollbackPerformed,
          rollbackSuccessful: result.rollbackSuccessful,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Saga execution threw unexpected error', { error });
      throw error;
    }
  }

  async triggerRollback(executor: ISagaExecutor): Promise<boolean> {
    this.logger.warn('Manually triggering saga rollback');

    try {
      const success = await executor.rollback();

      if (success) {
        this.logger.info('Manual rollback completed successfully');
      } else {
        this.logger.error('Manual rollback partially failed');
      }

      return success;
    } catch (error) {
      this.logger.error('Manual rollback threw error', { error });
      throw error;
    }
  }

  validateSteps(steps: SagaStep[]): ValidationResult {
    const errors: string[] = [];

    // Check if steps array is empty
    if (steps.length === 0) {
      errors.push('Steps array cannot be empty');
    }

    // Check each step has required fields
    steps.forEach((step, index) => {
      if (!step.name || step.name.trim() === '') {
        errors.push(`Step ${index}: name is required`);
      }

      if (!step.description || step.description.trim() === '') {
        errors.push(`Step ${index}: description is required`);
      }

      if (typeof step.execute !== 'function') {
        errors.push(`Step ${index} (${step.name}): execute must be a function`);
      }

      if (typeof step.compensate !== 'function') {
        errors.push(`Step ${index} (${step.name}): compensate must be a function`);
      }
    });

    // Check for duplicate step names
    const stepNames = steps.map(s => s.name);
    const duplicates = stepNames.filter((name, index) => stepNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
      errors.push(`Duplicate step names found: ${duplicates.join(', ')}`);
    }

    const valid = errors.length === 0;

    if (!valid) {
      this.logger.warn('Saga validation failed', { errors });
    }

    return { valid, errors };
  }
}
