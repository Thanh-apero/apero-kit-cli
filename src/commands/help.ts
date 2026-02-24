import { exec } from 'child_process';
import pc from 'picocolors';

const HELP_URL = 'https://www.vividkit.dev/vi/guides/what-is-claudekit';

export async function helpCommand(options: Record<string, any>): Promise<void> {
  console.log(pc.cyan('\n📚 Opening VividKit documentation...\n'));
  console.log(pc.green(`   ${HELP_URL}\n`));
  const openCommand = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCommand} ${HELP_URL}`);
}
