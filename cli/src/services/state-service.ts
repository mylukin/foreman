/**
 * StateService - Business logic for workflow state management
 *
 * Extracts state operations from CLI commands into testable service layer.
 * Uses dependency injection for repository and logger.
 */

import { State, Phase, StateConfig } from '../domain/state-entity';
import { IStateRepository } from '../repositories/state-repository';
import { ILogger } from '../infrastructure/logger';

export interface StateUpdate {
  phase?: Phase;
  currentTask?: string;
  prd?: any;
  addError?: any;
}

/**
 * IStateService interface for dependency injection
 */
export interface IStateService {
  /**
   * Get current workflow state
   */
  getState(): Promise<State | null>;

  /**
   * Initialize new workflow state
   */
  initializeState(phase?: Phase): Promise<State>;

  /**
   * Update state fields
   */
  updateState(updates: StateUpdate): Promise<State>;

  /**
   * Transition to new phase
   */
  transitionToPhase(targetPhase: Phase): Promise<State>;

  /**
   * Set current task
   */
  setCurrentTask(taskId: string | undefined): Promise<State>;

  /**
   * Set PRD (Product Requirements Document)
   */
  setPrd(prd: any): Promise<State>;

  /**
   * Add error to error list
   */
  addError(error: any): Promise<State>;

  /**
   * Clear error list
   */
  clearErrors(): Promise<State>;

  /**
   * Clear state (delete state file)
   */
  clearState(): Promise<void>;

  /**
   * Check if state exists
   */
  exists(): Promise<boolean>;
}

/**
 * StateService implementation
 */
export class StateService implements IStateService {
  constructor(
    private stateRepository: IStateRepository,
    private logger: ILogger
  ) {}

  async getState(): Promise<State | null> {
    this.logger.debug('Getting workflow state');
    return await this.stateRepository.get();
  }

  async initializeState(phase: Phase = 'clarify'): Promise<State> {
    this.logger.info(`Initializing workflow state`, { phase });

    // Check if state already exists
    const existing = await this.stateRepository.get();
    if (existing) {
      this.logger.warn('State already exists, returning existing state');
      return existing;
    }

    // Create new state
    const now = new Date().toISOString();
    const stateConfig: Omit<StateConfig, 'updatedAt'> = {
      phase,
      startedAt: now,
    };

    await this.stateRepository.set(stateConfig);

    const state = await this.stateRepository.get();
    if (!state) {
      throw new Error('Failed to initialize state');
    }

    this.logger.info(`Workflow state initialized`, { phase });
    return state;
  }

  async updateState(updates: StateUpdate): Promise<State> {
    this.logger.info('Updating workflow state', { updates });

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    // Apply updates using repository
    await this.stateRepository.update(updates);

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to update state');
    }

    this.logger.info('Workflow state updated');
    return updatedState;
  }

  async transitionToPhase(targetPhase: Phase): Promise<State> {
    this.logger.info(`Transitioning to phase: ${targetPhase}`);

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    // Validate transition (State entity will throw if invalid)
    if (!currentState.canTransitionTo(targetPhase)) {
      const allowedPhases = currentState.getNextAllowedPhases();
      throw new Error(
        `Cannot transition from ${currentState.phase} to ${targetPhase}. ` +
          `Allowed transitions: ${allowedPhases.join(', ')}`
      );
    }

    // Update phase
    await this.stateRepository.update({ phase: targetPhase });

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to transition phase');
    }

    this.logger.info(`Transitioned to phase: ${targetPhase}`);
    return updatedState;
  }

  async setCurrentTask(taskId: string | undefined): Promise<State> {
    this.logger.info('Setting current task', { taskId });

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    await this.stateRepository.update({ currentTask: taskId });

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to set current task');
    }

    this.logger.info('Current task set', { taskId });
    return updatedState;
  }

  async setPrd(prd: any): Promise<State> {
    this.logger.info('Setting PRD');

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    await this.stateRepository.update({ prd });

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to set PRD');
    }

    this.logger.info('PRD set');
    return updatedState;
  }

  async addError(error: any): Promise<State> {
    this.logger.error('Adding error to state', { error });

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    await this.stateRepository.update({ addError: error });

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to add error');
    }

    this.logger.error('Error added to state');
    return updatedState;
  }

  async clearErrors(): Promise<State> {
    this.logger.info('Clearing errors');

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    // Clear errors by calling the domain entity method
    currentState.clearErrors();

    // Save the updated state
    const stateConfig = currentState.toJSON();
    await this.stateRepository.set(stateConfig);

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to clear errors');
    }

    this.logger.info('Errors cleared');
    return updatedState;
  }

  async clearState(): Promise<void> {
    this.logger.info('Clearing workflow state');
    await this.stateRepository.clear();
    this.logger.info('Workflow state cleared');
  }

  async exists(): Promise<boolean> {
    return await this.stateRepository.exists();
  }
}
