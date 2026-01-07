import { GITHUB_CONFIG } from './.config';

import fs from 'fs';
import path from 'path';

const apiKeys = path.join(import.meta.dirname, 'keys.txt');

const githubToken = process.env.GITHUB_TOKEN;

if (!githubToken) {
    console.error('GITHUB_TOKEN environment variable not set');
    process.exit(1);
}

const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Authorization': `Bearer ${githubToken}`
};

const searchGitHub = async (query: string, page: string = '1') => {
    const response = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=100&page=${page}`, { headers });
    if (response.ok) return response.json();
    else {
        console.error(`GitHub API request failed: ${response.status} ${response.status}`);

        try {
            console.log(await response.text());
        } catch { }

        process.exit(1);
    }
}

const searchTimestamps: number[] = [];

const rateLimitedSearchGitHub = async (query: string, page: string = '1'): Promise<any> => {
    const now = Date.now();

    while (searchTimestamps.length && now - searchTimestamps[0] > 60000) searchTimestamps.shift();

    if (searchTimestamps.length >= 5) {
        const waitTime = 60000 - (now - searchTimestamps[0]);
        console.log(`rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    searchTimestamps.push(Date.now());

    return searchGitHub(query, page);
}

const fetchFileContent = async (url: string): Promise<any> => {
    const response = await fetch(url, { headers });
    if (response.ok) return response.json();
    else {
        console.error(`Failed to fetch file content: ${response.statusText}`);
        return null;
    }
}

const processItems = async (items: any[]) => {
    for (const item of items || []) {
        if (item.git_url) {
            const contentResults = await fetchFileContent(item.url);
            if (contentResults) {
                const fileContent = Buffer.from(contentResults.content, 'base64').toString('utf-8');
                const matches = fileContent.match(GITHUB_CONFIG.regex);
                if (matches) matches.forEach((key) => {
                    if (!key.toLowerCase().includes('abc') && !key.toLowerCase().includes('xxxxx')) matchedKeys.add(key)
                });
            }
        }
    }
}

const matchedKeys = new Set<string>();

const saveKeys = () => {
    if (matchedKeys.size > 0) {
        fs.writeFileSync(apiKeys, Array.from(matchedKeys).join('\n'), 'utf-8');
        console.log(`keys written to ${apiKeys}`);
    } else console.log('no keys matched the regex.');
}

try {
    const firstResults = await rateLimitedSearchGitHub(GITHUB_CONFIG.searchQuery, '1');
    const totalCount = firstResults.total_count;
    const perPage = 100;
    const totalPages = Math.ceil(totalCount / perPage);
    console.log(`total pages to process: ${totalPages}`);

    await processItems(firstResults.items);
    console.log('processed page 1');

    saveKeys();

    for (let page = 2; page <= totalPages; page++) {
        const pageResults = await rateLimitedSearchGitHub(GITHUB_CONFIG.searchQuery, page.toString());
        await processItems(pageResults.items);
        console.log(`processed page ${page}`);
        saveKeys();
    }
} catch (error: any) {
    console.error(`Error: ${error.message}`);
}