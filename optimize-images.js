import { existsSync, readdirSync, unlinkSync, renameSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Install required packages if they don't exist
try {
  await import('sharp');
} catch (e) {
  console.log('Installing sharp...');
  execSync('npm install sharp --save-dev', { stdio: 'inherit' });
}

const sharp = (await import('sharp')).default;

async function optimizeImages() {
  const assetsPath = join(__dirname, 'src', 'assets');
  const files = readdirSync(assetsPath);
  const imageFiles = files.filter(file => 
    file.match(/\.(png|jpg|jpeg|webp)$/i)
  );

  console.log('Found images to optimize:', imageFiles);

  for (const file of imageFiles) {
    const inputPath = join(assetsPath, file);
    const outputPath = join(assetsPath, `opt_${file}`);
    const outputFileName = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    const outputFilePath = join(assetsPath, outputFileName);
    
    try {
      console.log(`Optimizing ${file}...`);
      
      // Skip if already optimized
      if (file.endsWith('.webp')) {
        console.log(`Skipping ${file} (already WebP)`);
        continue;
      }
      
      await sharp(inputPath)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality: 80,
          effort: 6
        })
        .toFile(outputFilePath);
      
      // Remove original file
      unlinkSync(inputPath);
      
      // Update any references in the code if needed
      console.log(`Optimized ${file} -> ${outputFileName}`);
    } catch (error) {
      console.error(`Error optimizing ${file}:`, error.message);
      // Clean up partial output file if it exists
      if (existsSync(outputFilePath)) {
        unlinkSync(outputFilePath);
      }
    }
  }
  
  console.log('Image optimization complete!');
  console.log('Please update any image references in your code to use .webp instead of .png/.jpg');
}

// Run the optimization
optimizeImages().catch(console.error);
