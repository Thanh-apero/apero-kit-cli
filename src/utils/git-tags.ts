import { execSync } from 'child_process';

const REMOTE_REPO_URL = 'https://github.com/Thanhnguyen6702/CK-Internal.git';

export { REMOTE_REPO_URL };

export function fetchRemoteTags(repoUrl: string = REMOTE_REPO_URL): string[] {
  const output = execSync(`git ls-remote --tags "${repoUrl}"`, {
    encoding: 'utf-8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  return output.split('\n')
    .filter(line => line.includes('refs/tags/'))
    .map(line => {
      const tag = line.split('refs/tags/')[1]?.replace('^{}', '');
      return tag;
    })
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe
}

export function sortSemver(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const pa = a.replace(/^v/, '').split(/[.-]/);
    const pb = b.replace(/^v/, '').split(/[.-]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = parseInt(pa[i]) || 0;
      const nb = parseInt(pb[i]) || 0;
      if (na !== nb) return nb - na; // descending
    }
    return 0;
  });
}
