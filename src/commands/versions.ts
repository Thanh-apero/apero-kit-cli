import pc from 'picocolors';
import ora from 'ora';
import { fetchRemoteTags, sortSemver } from '../utils/git-tags.js';

export async function versionsCommand(options: Record<string, any>): Promise<void> {
  const spinner = ora('Fetching available versions...').start();

  try {
    const tags = fetchRemoteTags();
    spinner.stop();

    if (!tags || tags.length === 0) {
      console.log(pc.yellow('\nNo versions found.'));
      return;
    }

    // Filter pre-releases unless --all
    let filtered = tags;
    if (!options.all) {
      filtered = tags.filter(tag => !tag.includes('-'));
    }

    // Sort by semver
    const sorted = sortSemver(filtered);

    // Apply limit
    const limit = options.limit ? parseInt(options.limit, 10) : 10;
    const limited = sorted.slice(0, limit);

    console.log(pc.bold('\nAvailable versions:\n'));

    limited.forEach((tag, index) => {
      const isLatest = index === 0;
      const marker = isLatest ? pc.green(' (latest)') : '';
      console.log(`  ${pc.cyan(tag)}${marker}`);
    });

    if (sorted.length > limited.length) {
      console.log(pc.gray(`\n  ... and ${sorted.length - limited.length} more (use --limit or --all)`));
    }

    console.log('');
  } catch (err: any) {
    spinner.stop();
    console.log(pc.red('\nFailed to fetch versions.'));
    console.log(pc.gray(err.message));

    if (err.message.includes('timeout')) {
      console.log(pc.gray('Network timeout. Check your connection.'));
    }
  }
}
