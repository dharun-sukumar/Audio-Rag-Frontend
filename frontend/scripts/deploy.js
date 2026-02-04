import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const NGINX_ROOT = '/var/www/transcribe.alterwork.in';
const DIST_DIR = join(process.cwd(), 'dist');

console.log('🚀 Starting deployment...');
console.log(`📦 Source: ${DIST_DIR}`);
console.log(`📂 Destination: ${NGINX_ROOT}`);

// Check if dist directory exists
if (!existsSync(DIST_DIR)) {
  console.error('❌ Error: dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

try {
  // Get current build files to keep
  const distAssets = existsSync(join(DIST_DIR, 'assets')) 
    ? readdirSync(join(DIST_DIR, 'assets')).filter(f => f.startsWith('index-'))
    : [];
  
  console.log('📋 Copying files...');
  execSync(`sudo cp -r ${DIST_DIR}/* ${NGINX_ROOT}/`, { stdio: 'inherit' });
  
  // Set correct permissions
  console.log('🔐 Setting permissions...');
  execSync(`sudo chown -R www-data:www-data ${NGINX_ROOT}/`, { stdio: 'inherit' });
  
  // Clean up old asset files (keep only current build files)
  if (distAssets.length > 0 && existsSync(join(NGINX_ROOT, 'assets'))) {
    console.log('🧹 Cleaning up old assets...');
    const nginxAssets = readdirSync(join(NGINX_ROOT, 'assets'));
    const oldAssets = nginxAssets.filter(f => 
      f.startsWith('index-') && !distAssets.includes(f)
    );
    
    if (oldAssets.length > 0) {
      oldAssets.forEach(file => {
        try {
          execSync(`sudo rm -f ${join(NGINX_ROOT, 'assets', file)}`, { stdio: 'inherit' });
          console.log(`   Removed: ${file}`);
        } catch (e) {
          // Ignore individual file errors
        }
      });
    }
  }
  
  console.log('✅ Deployment completed successfully!');
  console.log(`🌐 Files are now live at: ${NGINX_ROOT}`);
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
