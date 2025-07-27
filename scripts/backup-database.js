#!/usr/bin/env node

/**
 * Database Backup Script for Subscription System
 * This script creates backups of the MongoDB database with compression and encryption
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/subscription_db',
  backupDir: process.env.BACKUP_DIR || '/var/backups/subscription-system',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY,
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  compress: true,
  encrypt: !!process.env.BACKUP_ENCRYPTION_KEY
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  options[key] = value;
}

// Override config with command line options
if (options.output) config.backupDir = path.dirname(options.output);
if (options.uri) config.mongoUri = options.uri;
if (options.encrypt === 'false') config.encrypt = false;
if (options.compress === 'false') config.compress = false;

/**
 * Log message with timestamp
 */
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Log error message
 */
function error(message) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
}

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    log(`Created backup directory: ${config.backupDir}`);
  }
}

/**
 * Generate backup filename
 */
function generateBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const basename = `subscription-db-backup-${timestamp}`;

  let filename = basename;
  if (config.compress) filename += '.gz';
  if (config.encrypt) filename += '.enc';

  return path.join(config.backupDir, filename);
}

/**
 * Execute mongodump command
 */
function executeMongodump(outputPath) {
  return new Promise((resolve, reject) => {
    log('Starting MongoDB backup...');

    const args = [
      '--uri', config.mongoUri,
      '--archive'
    ];

    if (config.compress) {
      args.push('--gzip');
    }

    log(`Executing: mongodump ${args.join(' ')}`);

    const mongodump = spawn('mongodump', args);
    const writeStream = fs.createWriteStream(outputPath);

    mongodump.stdout.pipe(writeStream);

    mongodump.stderr.on('data', (data) => {
      log(`mongodump stderr: ${data}`);
    });

    mongodump.on('close', (code) => {
      writeStream.end();

      if (code === 0) {
        log('MongoDB backup completed successfully');
        resolve();
      } else {
        error(`mongodump exited with code ${code}`);
        reject(new Error(`mongodump failed with code ${code}`));
      }
    });

    mongodump.on('error', (err) => {
      error(`mongodump error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Encrypt backup file
 */
function encryptBackup(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!config.encrypt || !config.encryptionKey) {
      resolve(inputPath);
      return;
    }

    log('Encrypting backup...');

    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(config.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);

      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      // Write IV to the beginning of the file
      output.write(iv);

      input.pipe(cipher).pipe(output);

      output.on('finish', () => {
        // Remove unencrypted file
        fs.unlinkSync(inputPath);
        log('Backup encrypted successfully');
        resolve(outputPath);
      });

      output.on('error', reject);
      cipher.on('error', reject);

    } catch (err) {
      error(`Encryption failed: ${err.message}`);
      reject(err);
    }
  });
}

/**
 * Verify backup file
 */
function verifyBackup(backupPath) {
  return new Promise((resolve, reject) => {
    log('Verifying backup...');

    try {
      const stats = fs.statSync(backupPath);

      if (stats.size === 0) {
        reject(new Error('Backup file is empty'));
        return;
      }

      log(`Backup file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      log('Backup verification completed');
      resolve();

    } catch (err) {
      error(`Backup verification failed: ${err.message}`);
      reject(err);
    }
  });
}

/**
 * Clean up old backups
 */
function cleanupOldBackups() {
  return new Promise((resolve, reject) => {
    log('Cleaning up old backups...');

    try {
      const files = fs.readdirSync(config.backupDir);
      const backupFiles = files.filter(file =>
        file.startsWith('subscription-db-backup-') &&
        (file.endsWith('.gz') || file.endsWith('.enc'))
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

      let deletedCount = 0;

      backupFiles.forEach(file => {
        const filePath = path.join(config.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          log(`Deleted old backup: ${file}`);
        }
      });

      log(`Cleanup completed. Deleted ${deletedCount} old backup(s)`);
      resolve();

    } catch (err) {
      error(`Cleanup failed: ${err.message}`);
      reject(err);
    }
  });
}

/**
 * Create backup metadata
 */
function createBackupMetadata(backupPath) {
  const metadata = {
    timestamp: new Date().toISOString(),
    filename: path.basename(backupPath),
    size: fs.statSync(backupPath).size,
    mongoUri: config.mongoUri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
    compressed: config.compress,
    encrypted: config.encrypt,
    version: require('../package.json').version
  };

  const metadataPath = backupPath + '.meta.json';
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  log(`Backup metadata saved: ${metadataPath}`);
  return metadataPath;
}

/**
 * Main backup function
 */
async function createBackup() {
  try {
    log('Starting subscription system database backup...');

    // Ensure backup directory exists
    ensureBackupDirectory();

    // Generate backup filename
    const tempBackupPath = generateBackupFilename().replace(/\.(gz|enc)$/, '');
    const finalBackupPath = generateBackupFilename();

    // Create database backup
    await executeMongodump(tempBackupPath);

    // Encrypt backup if required
    let backupPath = tempBackupPath;
    if (config.encrypt) {
      backupPath = await encryptBackup(tempBackupPath, finalBackupPath);
    } else if (config.compress) {
      // If only compression (mongodump already compressed with --gzip)
      fs.renameSync(tempBackupPath, finalBackupPath);
      backupPath = finalBackupPath;
    }

    // Verify backup
    await verifyBackup(backupPath);

    // Create metadata
    createBackupMetadata(backupPath);

    // Clean up old backups
    await cleanupOldBackups();

    log(`✅ Backup completed successfully: ${backupPath}`);

    // Output backup path for scripts
    if (options.output) {
      console.log(backupPath);
    }

    process.exit(0);

  } catch (err) {
    error(`Backup failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
Usage: node backup-database.js [options]

Options:
  --uri <uri>           MongoDB connection URI
  --output <path>       Output directory for backup
  --encrypt <true|false> Enable/disable encryption (default: ${config.encrypt})
  --compress <true|false> Enable/disable compression (default: ${config.compress})
  --help               Show this help message

Environment Variables:
  MONGODB_URI          MongoDB connection URI
  BACKUP_DIR           Backup directory path
  BACKUP_ENCRYPTION_KEY Encryption key for backups
  BACKUP_RETENTION_DAYS Number of days to keep backups (default: 30)

Examples:
  node backup-database.js
  node backup-database.js --uri mongodb://localhost:27017/mydb
  node backup-database.js --output /tmp/backup.gz
  node backup-database.js --encrypt false --compress true
`);
}

// Handle command line arguments
if (options.help) {
  showUsage();
  process.exit(0);
}

// Check if mongodump is available
const { spawn: spawnSync } = require('child_process');
const mongodumpCheck = spawnSync('which', ['mongodump'], { stdio: 'pipe' });

mongodumpCheck.on('close', (code) => {
  if (code !== 0) {
    error('mongodump is not installed or not in PATH');
    error('Please install MongoDB Database Tools: https://docs.mongodb.com/database-tools/');
    process.exit(1);
  } else {
    // Start backup process
    createBackup();
  }
});

mongodumpCheck.on('error', (err) => {
  error('Failed to check for mongodump availability');
  error('Please ensure MongoDB Database Tools are installed');
  process.exit(1);
});