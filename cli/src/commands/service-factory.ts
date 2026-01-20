/**
 * Service Factory - Dependency Injection Container
 *
 * Creates and wires up services with their dependencies.
 * Provides a central place for dependency management.
 */

import * as path from 'path';
import { TaskService, ITaskService } from '../services/task-service';
import { StateService, IStateService } from '../services/state-service';
import { StatusService, IStatusService } from '../services/status-service';
import { DetectionService, IDetectionService } from '../services/detection-service';
import { HealingService, IHealingService } from '../services/healing-service';
import { FileSystemTaskRepository } from '../repositories/task-repository.service';
import { FileSystemStateRepository } from '../repositories/state-repository.service';
import { LanguageDetector } from '../language/detector';
import { IndexManager } from '../core/index-manager';
import { FileSystemService } from '../infrastructure/file-system.service';
import { ConsoleLogger } from '../infrastructure/logger.service';
import { ILogger } from '../infrastructure/logger';

/**
 * Service container holding all initialized services
 */
export interface ServiceContainer {
  taskService: ITaskService;
  stateService: IStateService;
  statusService: IStatusService;
  detectionService: IDetectionService;
  healingService: IHealingService;
  logger: ILogger;
}

/**
 * Create and wire up all services for a workspace
 */
export function createServices(workspaceDir: string): ServiceContainer {
  // Create shared infrastructure
  const logger = new ConsoleLogger();
  const fileSystem = new FileSystemService();

  // Create repositories
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const taskRepository = new FileSystemTaskRepository(fileSystem, tasksDir);
  const stateRepository = new FileSystemStateRepository(fileSystem, workspaceDir);

  // Create services with dependency injection
  const taskService = new TaskService(taskRepository, stateRepository, logger);
  const stateService = new StateService(stateRepository, logger);
  const statusService = new StatusService(taskRepository, stateRepository, logger);

  // Detection service
  const indexManager = new IndexManager(tasksDir);
  const detectionService = new DetectionService(
    LanguageDetector,
    indexManager,
    logger,
    workspaceDir
  );

  // Healing service with circuit breaker
  const healingService = new HealingService(logger, fileSystem, workspaceDir, {
    failureThreshold: 5,
    timeout: 60000,
    successThreshold: 2,
  });

  return {
    taskService,
    stateService,
    statusService,
    detectionService,
    healingService,
    logger,
  };
}

/**
 * Create TaskService (convenience function for task commands)
 */
export function createTaskService(workspaceDir: string): ITaskService {
  const logger = new ConsoleLogger();
  const fileSystem = new FileSystemService();
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const taskRepository = new FileSystemTaskRepository(fileSystem, tasksDir);
  const stateRepository = new FileSystemStateRepository(fileSystem, workspaceDir);

  return new TaskService(taskRepository, stateRepository, logger);
}

/**
 * Create StatusService (convenience function for status command)
 */
export function createStatusService(workspaceDir: string): IStatusService {
  const logger = new ConsoleLogger();
  const fileSystem = new FileSystemService();
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const taskRepository = new FileSystemTaskRepository(fileSystem, tasksDir);
  const stateRepository = new FileSystemStateRepository(fileSystem, workspaceDir);

  return new StatusService(taskRepository, stateRepository, logger);
}

/**
 * Create StateService (convenience function for state command)
 */
export function createStateService(workspaceDir: string): IStateService {
  const logger = new ConsoleLogger();
  const fileSystem = new FileSystemService();
  const stateRepository = new FileSystemStateRepository(fileSystem, workspaceDir);

  return new StateService(stateRepository, logger);
}

/**
 * Create DetectionService (convenience function for detect command)
 */
export function createDetectionService(workspaceDir: string): IDetectionService {
  const logger = new ConsoleLogger();
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const indexManager = new IndexManager(tasksDir);

  return new DetectionService(LanguageDetector, indexManager, logger, workspaceDir);
}
