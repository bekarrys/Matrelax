const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'server', 'data');

const dirs = [
  path.join(baseDir, 'catalog'),
  path.join(baseDir, 'orders'),
  path.join(baseDir, 'staff'),
  path.join(baseDir, 'finance'),
  path.join(__dirname, '..', 'server', 'logs'),
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created: ${dir}`);
  }
});

// Create empty registry if not exists
const registryPath = path.join(baseDir, 'orders', 'registry.json');
if (!fs.existsSync(registryPath)) {
  fs.writeFileSync(registryPath, JSON.stringify({ orders: [] }, null, 2));
  console.log(`Created: ${registryPath}`);
}

// Create empty employees if not exists
const employeesPath = path.join(baseDir, 'staff', 'employees.json');
if (!fs.existsSync(employeesPath)) {
  fs.writeFileSync(employeesPath, JSON.stringify({ employees: [] }, null, 2));
  console.log(`Created: ${employeesPath}`);
}

// Create empty debts if not exists
const debtsPath = path.join(baseDir, 'finance', 'debts.json');
if (!fs.existsSync(debtsPath)) {
  fs.writeFileSync(debtsPath, JSON.stringify({ debts: [] }, null, 2));
  console.log(`Created: ${debtsPath}`);
}

console.log('Folder initialization complete!');
