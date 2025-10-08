import { logger } from './logger.js';
import type { Command } from 'commander';

/**
 * Interface for command modules that can be lazy loaded
 */
export interface LazyCommandModule {
  [key: string]: any;
}

/**
 * Command metadata for lazy loading without importing full modules
 */
export interface CommandMetadata {
  name: string;
  description: string;
  aliases?: string[];
  modulePath: string;
  registrationFunction: string; // Name of the function that registers the command
  isCommandObject?: boolean; // If true, it's exported as a Command object, not a registration function
}

/**
 * CommandLoader manages dynamic importing of command modules
 * to reduce CLI startup time and memory usage
 */
export class CommandLoader {
  private readonly moduleCache = new Map<string, LazyCommandModule>();
  private readonly commandMetadata: CommandMetadata[] = [
    {
      name: 'list',
      description: 'List existing workspaces',
      aliases: ['ls'],
      modulePath: '../commands/list.js',
      registrationFunction: 'listCommand',
    },
    {
      name: 'init',
      description: 'Initialize a new workspace',
      aliases: ['new', 'create'],
      modulePath: '../commands/init.js',
      registrationFunction: 'initCommand',
    },
    {
      name: 'info',
      description: 'Show workspace details',
      modulePath: '../commands/info.js',
      registrationFunction: 'infoCommand',
    },
    {
      name: 'clean',
      description: 'Clean workspace',
      aliases: ['rm', 'remove'],
      modulePath: '../commands/clean.js',
      registrationFunction: 'cleanCommand',
    },
    {
      name: 'projects',
      description: 'Show available projects',
      modulePath: '../commands/projects.js',
      registrationFunction: 'projectsCommand',
    },
    {
      name: 'setup',
      description: 'Configure space-cli',
      modulePath: '../commands/setup.js',
      registrationFunction: 'setupCommand',
      isCommandObject: true,
    },
    {
      name: 'restore-config',
      description: 'Restore default configuration file',
      modulePath: '../commands/restore-config.js',
      registrationFunction: 'restoreConfigCommand',
    },
  ];

  /**
   * Get command metadata without loading modules
   */
  getCommandMetadata(): CommandMetadata[] {
    return this.commandMetadata;
  }

  /**
   * Load and register a command dynamically
   */
  async loadAndRegisterCommand(program: Command, commandName: string): Promise<boolean> {
    const metadata = this.commandMetadata.find(
      (cmd) => cmd.name === commandName || cmd.aliases?.includes(commandName),
    );

    if (!metadata) {
      logger.debug(`Command '${commandName}' not found in metadata`);
      return false;
    }

    // Check cache first
    if (this.moduleCache.has(metadata.modulePath)) {
      logger.debug(`Loading command '${commandName}' from cache`);
      const module = this.moduleCache.get(metadata.modulePath)!;
      const registrationItem = module[metadata.registrationFunction];

      if (metadata.isCommandObject) {
        // It's a Command object, add it directly
        if (registrationItem && typeof registrationItem.name === 'function') {
          program.addCommand(registrationItem);
          return true;
        }
      } else {
        // It's a registration function
        if (registrationItem && typeof registrationItem === 'function') {
          registrationItem(program);
          return true;
        }
      }
      return false;
    }

    // Load module dynamically
    try {
      logger.debug(`Dynamically importing command '${commandName}' from ${metadata.modulePath}`);
      const startTime = performance.now();

      const module = await import(metadata.modulePath);

      const loadTime = performance.now() - startTime;
      if (loadTime > 100) {
        logger.debug(`Slow module load: ${commandName} took ${loadTime.toFixed(2)}ms`);
      }

      // Cache the loaded module
      this.moduleCache.set(metadata.modulePath, module);

      // Register the command
      const registrationItem = module[metadata.registrationFunction];
      if (metadata.isCommandObject) {
        // It's a Command object, add it directly
        if (registrationItem && typeof registrationItem.name === 'function') {
          program.addCommand(registrationItem);
          return true;
        } else {
          logger.error(`Command object '${metadata.registrationFunction}' not found in module`);
          return false;
        }
      } else {
        // It's a registration function
        if (registrationItem && typeof registrationItem === 'function') {
          registrationItem(program);
          return true;
        } else {
          logger.error(
            `Registration function '${metadata.registrationFunction}' not found in module`,
          );
          return false;
        }
      }
    } catch (error) {
      logger.error(`Failed to load command '${commandName}': ${error}`);
      return false;
    }
  }

  /**
   * Load all command modules (for scenarios where all are needed)
   */
  async loadAllCommands(program: Command): Promise<void> {
    const loadPromises = this.commandMetadata.map(async (metadata) => {
      if (!this.moduleCache.has(metadata.modulePath)) {
        await this.loadAndRegisterCommand(program, metadata.name);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Clear module cache (useful for testing)
   */
  clearCache(): void {
    this.moduleCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; modules: string[] } {
    return {
      size: this.moduleCache.size,
      modules: Array.from(this.moduleCache.keys()),
    };
  }
}

// Export singleton instance
export const commandLoader = new CommandLoader();
