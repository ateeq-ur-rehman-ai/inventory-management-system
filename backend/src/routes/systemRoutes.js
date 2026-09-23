const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

const router = express.Router();
const backupsDirectory = path.resolve(__dirname, '../../backups');
const mysqlDump = process.env.MYSQLDUMP_PATH || 'mysqldump';
const mysqlClient = process.env.MYSQL_PATH || 'mysql';

const databaseArgs = () => [
  `--host=${process.env.DB_HOST}`,
  `--user=${process.env.DB_USER}`,
  `--password=${process.env.DB_PASSWORD}`,
  process.env.DB_NAME
];

const validBackupName = (name) => /^[a-zA-Z0-9_-]+\.sql$/.test(name || '');

function ensureBackupsDirectory() {
  fs.mkdirSync(backupsDirectory, { recursive: true });
}

function listBackups() {
  ensureBackupsDirectory();
  return fs.readdirSync(backupsDirectory)
    .filter(validBackupName)
    .map((name) => {
      const details = fs.statSync(path.join(backupsDirectory, name));
      return { name, size: details.size, createdAt: details.mtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

router.get('/backups', (req, res) => {
  try {
    res.json({ backups: listBackups() });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

router.post('/backups', (req, res) => {
  try {
    ensureBackupsDirectory();
    const name = `inventory_management_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const backupPath = path.join(backupsDirectory, name);
    const args = [...databaseArgs(), `--result-file=${backupPath}`];

    execFile(mysqlDump, args, { windowsHide: true }, (error) => {
      if (error) {
        console.error('Database backup failed:', error.message);
        return res.status(500).json({ error: 'Backup failed. Ensure mysqldump is installed and available in PATH.' });
      }
      res.status(201).json({ message: 'Backup created successfully', backup: { name, createdAt: new Date() } });
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

router.post('/restore', (req, res) => {
  const { name } = req.body;
  if (!validBackupName(name)) return res.status(400).json({ error: 'Invalid backup file.' });

  const backupPath = path.join(backupsDirectory, name);
  if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Backup file not found.' });

  const child = spawn(mysqlClient, databaseArgs(), { windowsHide: true });
  const input = fs.createReadStream(backupPath);
  input.pipe(child.stdin);

  let errorMessage = '';
  child.stderr.on('data', (chunk) => { errorMessage += chunk.toString(); });
  child.on('error', (error) => {
    console.error('Database restore failed:', error.message);
    res.status(500).json({ error: 'Restore failed. Ensure mysql is installed and available in PATH.' });
  });
  child.on('close', (code) => {
    if (res.headersSent) return;
    if (code !== 0) {
      console.error('Database restore failed:', errorMessage);
      return res.status(500).json({ error: 'Restore failed. The backup may be invalid.' });
    }
    res.json({ message: 'Database restored successfully. Restart the application to refresh all data.' });
  });
});

module.exports = router;
