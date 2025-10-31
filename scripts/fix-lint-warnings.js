#!/usr/bin/env node

/**
 * Automated Lint Warning Fixer
 * Fixes common ESLint warnings across the codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting automated lint warning fixes...\n');

// Get all TypeScript/TypeScript React files
function getAllTSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!['node_modules', '.next', 'out', 'dist', 'build'].includes(file)) {
        getAllTSFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Fix 1: Prefix unused caught errors with underscore
function fixUnusedCatchErrors(content) {
  // Match: } catch (error) { but error is not used
  // Replace with: } catch (_error) {
  return content.replace(
    /catch\s*\(\s*(error|err|e)\s*\)\s*\{([^}]*)\}/g,
    (match, errorName, body) => {
      // Check if error variable is used in the body
      const errorRegex = new RegExp(`\\b${errorName}\\b`, 'g');
      const matches = body.match(errorRegex);

      // If not used or only in comments, prefix with underscore
      if (!matches || matches.length === 0) {
        return match.replace(`(${errorName})`, `(_${errorName})`);
      }
      return match;
    }
  );
}

// Fix 2: Prefix unused function parameters with underscore
function fixUnusedParameters(content) {
  // This is complex and risky to automate - skip for safety
  return content;
}

// Fix 3: Remove unused imports (basic cases)
function removeUnusedImports(content) {
  const lines = content.split('\n');
  const importLines = [];
  const codeContent = lines.join('\n');

  lines.forEach((line, index) => {
    if (line.trim().startsWith('import ')) {
      importLines.push({ line, index });
    }
  });

  // Check each import
  let newContent = content;
  importLines.forEach(({ line }) => {
    // Extract imported items
    const match = line.match(/import\s+(?:\{([^}]+)\}|(\w+))/);
    if (match) {
      const imports = match[1] || match[2];
      if (imports) {
        const importNames = imports
          .split(',')
          .map(i => i.trim().split(' as ')[0].trim());

        // Check if any are used (basic check)
        const allUnused = importNames.every(name => {
          const regex = new RegExp(`\\b${name}\\b`, 'g');
          const matches = codeContent.match(regex);
          // If appears only once (in the import itself), it's unused
          return !matches || matches.length <= 1;
        });

        if (allUnused && !line.includes('type')) {
          // Comment out instead of removing (safer)
          newContent = newContent.replace(
            line,
            `// ${line} // Unused - commented by auto-fixer`
          );
        }
      }
    }
  });

  return newContent;
}

// Process files
const files = getAllTSFiles(process.cwd());
let fixedCount = 0;

console.log(`📁 Found ${files.length} TypeScript files\n`);

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply fixes
    content = fixUnusedCatchErrors(content);

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n✨ Fixed ${fixedCount} files automatically`);
console.log('\n🔄 Running ESLint auto-fix for remaining issues...\n');

try {
  execSync('npm run lint:fix', { stdio: 'inherit' });
} catch (error) {
  console.log('\n⚠️  Some warnings remain (expected)');
}

console.log('\n✅ Automated fixes complete!');
console.log('📊 Run "npm run lint" to see remaining warnings\n');
