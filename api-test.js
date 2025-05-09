#!/usr/bin/env node

const  const axios = require('axios');
const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

const HISTORY_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.api_test_history.json');

async function loadHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveHistory(request) {
  const history = await loadHistory();
  history.push({ ...request, timestamp: new Date().toISOString() });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function sendRequest(method, url, options = {}) {
  try {
    const requestConfig = {
      method,
      url,
      headers: options.headers || {},
      params: options.query || {},
      data: options.data || null,
    };

    const response = await axios(requestConfig);

    console.log(chalk.green(`Status: ${response.status} ${response.statusText}`));
    console.log(chalk.blue('Headers:'));
    console.log(JSON.stringify(response.headers, null, 2));
    console.log(chalk.blue('Body:'));
    console.log(JSON.stringify(response.data, null, 2));

    await saveHistory({
      method,
      url,
      options,
      status: response.status,
    });
  } catch (error) {
    console.error(chalk.red('Error:'));
    console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

program
  .command('get <url>')
  .description('Send a GET request to an API endpoint')
  .option('-q, --query <items>', 'Query parameters (e.g., key=value)', parseQuery)
  .option('-H, --header <items>', 'Custom headers (e.g., key=value)', parseHeaders)
  .action((url, options) => sendRequest('get', url, options));

program
  .command('post <url>')
  .description('Send a POST request to an API endpoint')
  .option('-d, --data <json>', 'JSON body for the request', JSON.parse)
  .option('-H, --header <items>', 'Custom headers (e.g., key=value)', parseHeaders)
  .action((url, options) => sendRequest('post', url, options));

program
  .command('history')
  .description('Show request history')
  .action(async () => {
    const history = await loadHistory();
    if (!history.length) {
      console.log(chalk.yellow('No history found.'));
      return;
    }
    history.forEach((req, index) => {
      console.log(chalk.cyan(`Request ${index + 1}: ${req.method.toUpperCase()} ${req.url}`));
      console.log(`Timestamp: ${req.timestamp}`);
      console.log(`Status: ${req.status}`);
      console.log('---');
    });
  });

function parseQuery(query) {
  if (!query) return {};
  return query.split(',').reduce((acc, item) => {
    const [key, value] = item.split('=');
    acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

function parseHeaders(headers) {
  if (!headers) return {};
  return headers.split(',').reduce((acc, item) => {
    const [key, value] = item.split('=');
    acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
