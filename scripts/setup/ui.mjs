/**
 * Tiny, dependency-free prompt toolkit for the setup wizard.
 *
 * - Works interactively (TTY) and with piped input (lines are queued, so
 *   answers piped in ahead of time are never dropped).
 * - In a TTY, defaults are pre-filled so they can be edited in place.
 * - Secret prompts never echo input.
 * - Ctrl+C / end of input rejects with CancelledError so the caller can
 *   exit without writing anything.
 */
import readline from "node:readline";
import { stdin, stdout, env } from "node:process";

export class CancelledError extends Error {
  constructor() {
    super("Setup cancelled.");
    this.name = "CancelledError";
  }
}

const useColor = stdout.isTTY && !env.NO_COLOR && env.TERM !== "dumb";
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const c = {
  bold: paint("1"),
  dim: paint("2"),
  red: paint("31"),
  green: paint("32"),
  yellow: paint("33"),
  cyan: paint("36"),
};

export const log = {
  info: (msg = "") => stdout.write(`${msg}\n`),
  step: (title) => stdout.write(`\n${c.bold(c.cyan(`── ${title} `))}${c.dim("─".repeat(Math.max(0, 48 - title.length)))}\n`),
  hint: (msg) => stdout.write(`  ${c.dim(msg)}\n`),
  ok: (msg) => stdout.write(`${c.green("✔")} ${msg}\n`),
  warn: (msg) => stdout.write(`${c.yellow("!")} ${msg}\n`),
  error: (msg) => stdout.write(`${c.red("✖")} ${msg}\n`),
};

export function createPrompter() {
  const interactive = Boolean(stdin.isTTY);
  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: interactive });

  const queue = [];
  const waiters = [];
  let closed = false;
  let muted = false;

  // Hide typed characters for secret prompts (only the final newline is shown).
  const write = rl._writeToOutput?.bind(rl);
  if (write) {
    rl._writeToOutput = (s) => {
      if (!muted) return write(s);
      if (/[\r\n]/.test(s)) stdout.write("\n");
    };
  }

  rl.on("line", (line) => {
    if (waiters.length) waiters.shift().resolve(line);
    else queue.push(line);
  });

  const cancelAll = () => {
    closed = true;
    while (waiters.length) waiters.shift().reject(new CancelledError());
  };
  rl.on("close", cancelAll);
  rl.on("SIGINT", () => {
    stdout.write("\n");
    rl.close();
  });

  function nextLine() {
    if (queue.length) return Promise.resolve(queue.shift());
    if (closed || rl.closed) return Promise.reject(new CancelledError());
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  }

  async function raw(promptText, { prefill = "", secret = false } = {}) {
    if (closed || rl.closed) {
      // Piped input already ended; answer from the queued lines (or cancel).
      stdout.write(promptText);
    } else {
      rl.setPrompt(promptText);
      rl.prompt();
      if (interactive && prefill && !secret) rl.write(prefill);
    }
    muted = secret;
    try {
      const line = await nextLine();
      if (!interactive && !secret) stdout.write(`${line}\n`); // echo piped answers for readable logs
      if (!interactive && secret) stdout.write("\n");
      return line;
    } finally {
      muted = false;
    }
  }

  /**
   * Ask for free text.
   * @param {string} message
   * @param {object} [o]
   * @param {string} [o.initial]   default value (pre-filled in a TTY, used on empty input)
   * @param {boolean} [o.required]
   * @param {boolean} [o.secret]   hide input; never echoed or printed
   * @param {string} [o.hint]      one-line help shown under the question
   * @param {(v: string) => string|true} [o.validate] return an error message or true
   * @param {(v: string) => string} [o.transform] normalise before validation
   */
  async function text(message, o = {}) {
    const { initial = "", required = false, secret = false, hint, validate, transform } = o;
    stdout.write(`\n${c.cyan("?")} ${c.bold(message)}\n`);
    if (hint) log.hint(hint);
    if (secret) log.hint("Input is hidden.");
    if (!interactive && initial && !secret) log.hint(`Default: ${initial}`);

    for (;;) {
      let value = (await raw(`  ${c.cyan("›")} `, { prefill: initial, secret })).trim();
      if (!value && initial && (!interactive || secret)) value = initial;
      if (value === "-" && !required) value = ""; // explicit clear
      if (transform && value) value = transform(value);

      if (!value) {
        if (required) {
          log.error("This field is required.");
          continue;
        }
        return "";
      }
      const result = validate ? validate(value) : true;
      if (result === true) return value;
      log.error(result);
    }
  }

  async function confirm(message, initial = true) {
    stdout.write(`\n${c.cyan("?")} ${c.bold(message)} ${c.dim(initial ? "(Y/n)" : "(y/N)")}\n`);
    for (;;) {
      const v = (await raw(`  ${c.cyan("›")} `)).trim().toLowerCase();
      if (!v) return initial;
      if (["y", "yes"].includes(v)) return true;
      if (["n", "no"].includes(v)) return false;
      log.error("Please answer y or n.");
    }
  }

  /**
   * Pick one option. choices: [{ value, label, hint? }]
   */
  async function select(message, choices, initial) {
    stdout.write(`\n${c.cyan("?")} ${c.bold(message)}\n`);
    const defIndex = Math.max(0, choices.findIndex((ch) => ch.value === initial));
    choices.forEach((ch, i) => {
      const marker = i === defIndex ? c.cyan("●") : c.dim("○");
      stdout.write(`  ${marker} ${i + 1}) ${ch.label}${ch.hint ? c.dim(`  — ${ch.hint}`) : ""}\n`);
    });
    for (;;) {
      const v = (await raw(`  ${c.cyan("›")} ${c.dim(`[1-${choices.length}, default ${defIndex + 1}]`)} `)).trim();
      if (!v) return choices[defIndex].value;
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1].value;
      const byValue = choices.find((ch) => String(ch.value).toLowerCase() === v.toLowerCase());
      if (byValue) return byValue.value;
      log.error(`Enter a number between 1 and ${choices.length}.`);
    }
  }

  return { text, confirm, select, interactive, close: () => rl.close() };
}
