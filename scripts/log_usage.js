// Zápis spotreby agenta do logs/usage.csv.
// Použitie: node scripts/log_usage.js <candidate_id> <ico> <rola> <started_at> <finished_at> <pages> <tool_calls> <tokens>
// Tokeny sú súhrn, ktorý hlási nástroj (vstup + výstup spolu); output_tokens sa preto necháva prázdny.
const { readCsv, writeCsv } = require('./lib');
const [candidate_id, ico, agent_role, started_at, finished_at, pages_opened, tool_calls, input_tokens] = process.argv.slice(2);
const u = readCsv('logs/usage.csv');
u.push({ candidate_id, ico, agent_role, started_at, finished_at, pages_opened, tool_calls, input_tokens, output_tokens: '' });
writeCsv('logs/usage.csv', ['candidate_id', 'ico', 'agent_role', 'started_at', 'finished_at', 'pages_opened', 'tool_calls', 'input_tokens', 'output_tokens'], u);
