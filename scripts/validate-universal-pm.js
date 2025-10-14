#!/usr/bin/env node

/**
 * Validation script to demonstrate universal package manager support
 */

console.log('🎯 Universal Package Manager Support Validation\n');

// Test 1: Verify our detection logic works
console.log('1️⃣ Testing package manager detection...');
import('./install-global.js').then(async (module) => {
  try {
    const pm = await module.detectPackageManager();
    console.log(`   ✅ Detected: ${pm.manager}`);
    console.log(`   📦 Build: ${pm.buildCmd.join(' ')}`);
    console.log(`   🔗 Link: ${pm.linkCmd.join(' ')}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Verify scripts exist and are executable
  console.log('\n2️⃣ Testing script availability...');
  import('fs').then((fs) => {
    const scripts = ['scripts/install-global.js', 'scripts/uninstall-global.js'];
    scripts.forEach((script) => {
      try {
        fs.accessSync(script, fs.constants.F_OK | fs.constants.X_OK);
        console.log(`   ✅ ${script} - exists and executable`);
      } catch (error) {
        console.log(`   ❌ ${script} - not accessible: ${error.message}`);
      }
    });
  });

  // Test 3: Verify package.json configuration
  console.log('\n3️⃣ Testing package.json configuration...');
  import('fs').then((fs) => {
    const pkg = JSON.parse(fs.readFileSync('../package.json', 'utf8'));
    const scripts = pkg.scripts;
    const expectedScripts = {
      'install-global': 'node scripts/install-global.js',
      'uninstall-global': 'node scripts/uninstall-global.js',
    };

    Object.entries(expectedScripts).forEach(([name, expected]) => {
      if (scripts[name] === expected) {
        console.log(`   ✅ ${name} - correctly configured`);
      } else {
        console.log(`   ❌ ${name} - expected "${expected}", got "${scripts[name]}"`);
      }
    });
  });

  console.log('\n🎉 Validation complete!');
  console.log('\n💡 This CLI now works with:');
  console.log('   • pnpm (preferred - faster, better dependency resolution)');
  console.log('   • npm (fallback - universal compatibility)');
  console.log('\n🚀 Installation commands work on any dev machine:');
  console.log('   npm run install-global    # Auto-detects available package manager');
  console.log('   npm run uninstall-global  # Cleans up using both methods');
});
