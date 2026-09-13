'use client';
import { useState } from 'react';
export type BankAccount = {
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  identification: string;
};
export function BankAccountsEditor({
  accounts,
  onChange,
}: {
  accounts: BankAccount[];
  onChange: (accounts: BankAccount[]) => void;
}) {
  const labels: Record<keyof BankAccount, string> = {
    bankName: 'Banco',
    accountType: 'Tipo de cuenta',
    accountNumber: 'Número de cuenta',
    accountHolder: 'Titular',
    identification: 'Cédula / RUC',
  };
  const limits: Record<keyof BankAccount, number> = {
    bankName: 100,
    accountType: 50,
    accountNumber: 80,
    accountHolder: 180,
    identification: 40,
  };
  return (
    <div className="my-5 grid gap-4">
      {accounts.map((account, index) => (
        <fieldset
          key={index}
          className="rounded-2xl border border-black/10 p-4"
        >
          <legend className="px-2 font-semibold">Cuenta {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(labels) as (keyof BankAccount)[]).map((key) => (
              <label key={key} className="grid gap-1 text-sm">
                {labels[key]}
                <input
                  required
                  maxLength={limits[key]}
                  value={account[key]}
                  onChange={(e) =>
                    onChange(
                      accounts.map((a, i) =>
                        i === index ? { ...a, [key]: e.target.value } : a,
                      ),
                    )
                  }
                  className="h-11 rounded-xl border border-black/15 bg-white px-3"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={accounts.length === 1}
            onClick={() => onChange(accounts.filter((_, i) => i !== index))}
            className="mt-3 text-sm text-red-800 underline disabled:opacity-40"
          >
            Quitar cuenta
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={accounts.length >= 8}
        onClick={() =>
          onChange([
            ...accounts,
            {
              bankName: '',
              accountType: '',
              accountNumber: '',
              accountHolder: '',
              identification: '',
            },
          ])
        }
        className="w-fit rounded-full border px-4 py-2 text-sm"
      >
        Añadir otra cuenta
      </button>
    </div>
  );
}
export function PaymentAccounts({
  accounts,
  instructions,
}: {
  accounts: BankAccount[];
  instructions: string;
}) {
  const [copied, setCopied] = useState('');
  return (
    <div className="mt-5 grid gap-3">
      <p className="text-sm text-black/65">
        Elige una sola cuenta para transferir el total del pedido.
      </p>
      {accounts.map((a, i) => (
        <details
          key={`${a.bankName}-${a.accountNumber}`}
          open={accounts.length === 1 || undefined}
          className="rounded-2xl border border-[#d8b96e]/40 bg-[#faf8f2] p-4"
        >
          <summary className="cursor-pointer font-semibold">
            {a.bankName}{' '}
            <span className="font-normal text-black/60">· {a.accountType}</span>
          </summary>
          <dl className="mt-4 grid gap-2 break-words text-sm">
            <div>
              <dt className="text-black/55">Número de cuenta</dt>
              <dd className="select-all text-lg font-semibold tracking-wider">
                {a.accountNumber}
              </dd>
            </div>
            <div>
              <dt className="text-black/55">Titular</dt>
              <dd>{a.accountHolder}</dd>
            </div>
            <div>
              <dt className="text-black/55">Cédula / RUC</dt>
              <dd>{a.identification}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(a.accountNumber);
                setCopied(`Cuenta ${i + 1} copiada.`);
              } catch {
                setCopied(
                  'Selecciona el número de cuenta y cópialo manualmente.',
                );
              }
            }}
            className="mt-3 rounded-full border border-black/15 bg-white px-4 py-2 text-sm"
          >
            Copiar número de cuenta
          </button>
        </details>
      ))}
      {instructions && (
        <p className="whitespace-pre-line text-sm leading-7 text-black/70">
          {instructions}
        </p>
      )}
      {copied && <output className="text-sm text-green-800">{copied}</output>}
    </div>
  );
}
