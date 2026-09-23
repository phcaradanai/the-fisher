import { validateContentCatalogs } from '../../src/content/validate';

const issues = validateContentCatalogs();

if (issues.length > 0) {
  console.error(`Content validation failed with ${issues.length} issue${issues.length === 1 ? '' : 's'}:`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('Content validation passed.');
}
