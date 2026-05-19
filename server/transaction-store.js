import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const storePath = resolve(process.cwd(), "data", "ottopay-transactions.json");

async function readTransactions() {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeTransactions(transactions) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(transactions, null, 2)}\n`);
}

export async function saveTransaction(transaction) {
  const transactions = await readTransactions();
  transactions.unshift(transaction);
  await writeTransactions(transactions);
  return transaction;
}

export async function updateTransactionStatus(orderId, status, callbackPayload) {
  const transactions = await readTransactions();
  const index = transactions.findIndex((transaction) => transaction.orderId === orderId);
  const updatedAt = new Date().toISOString();

  if (index === -1) {
    const transaction = {
      orderId,
      status,
      callbackPayload,
      createdAt: updatedAt,
      updatedAt
    };
    transactions.unshift(transaction);
    await writeTransactions(transactions);
    return transaction;
  }

  transactions[index] = {
    ...transactions[index],
    status,
    callbackPayload,
    updatedAt
  };
  await writeTransactions(transactions);
  return transactions[index];
}
