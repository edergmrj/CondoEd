import test from 'node:test';
import assert from 'node:assert/strict';
import { allocate, centsToInput, parseDecimal, parseMoney } from '../src/lib/money';
import { lateFees } from '../src/lib/finance';
import { addMonths, daysBetween, dueDateFor, fmtDate, fmtMonth, isValidDate, isValidMonth, todayISO } from '../src/lib/dates';

test('parseMoney entende formatos brasileiros e internacionais', () => {
  assert.equal(parseMoney('1.234,56'), 123456);
  assert.equal(parseMoney('1234,56'), 123456);
  assert.equal(parseMoney('1234.56'), 123456);
  assert.equal(parseMoney('R$ 10'), 1000);
  assert.equal(parseMoney('0,5'), 50);
  assert.equal(parseMoney('0,07'), 7);
  assert.equal(parseMoney('1.234'), 123400); // ponto com 3 dígitos = milhar
  assert.equal(parseMoney('1.234.567,89'), 123456789);
  assert.equal(parseMoney('-25,00'), -2500);
  assert.equal(parseMoney(''), null);
  assert.equal(parseMoney('abc'), null);
  assert.equal(parseMoney('1,234'), null); // 3 casas decimais é inválido
  assert.equal(centsToInput(123456), '1234,56');
});

test('parseDecimal', () => {
  assert.equal(parseDecimal('1,25'), 1.25);
  assert.equal(parseDecimal('1.25'), 1.25);
  assert.equal(parseDecimal('2,5%'), 2.5);
  assert.equal(parseDecimal('x'), null);
});

test('allocate rateia sem perder centavos', () => {
  const parts = allocate(1000001, [25.5, 24.5, 25, 25]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 1000001);
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocate(100, [0, 0]), [50, 50]);
  assert.deepEqual(allocate(0, [1, 2]), [0, 0]);
  const many = allocate(987654321, Array.from({ length: 97 }, (_, i) => 1 + (i % 7) * 0.37));
  assert.equal(many.reduce((a, b) => a + b, 0), 987654321);
});

test('lateFees: multa de 2% e juros de 1% ao mês pro rata', () => {
  assert.deepEqual(lateFees(100000, '2026-11-10', '2026-11-10', 2, 1), { days: 0, fine: 0, interest: 0, total: 0 });
  assert.deepEqual(lateFees(100000, '2026-11-10', '2026-11-05', 2, 1), { days: 0, fine: 0, interest: 0, total: 0 });
  const f = lateFees(100000, '2026-11-10', '2026-11-25', 2, 1); // 15 dias
  assert.equal(f.days, 15);
  assert.equal(f.fine, 2000);
  assert.equal(f.interest, 500);
  assert.equal(lateFees(100000, '2026-11-10', '2026-12-10', 2, 1).interest, 1000); // 30 dias = 1%
});

test('datas', () => {
  assert.equal(addMonths('2026-11', 2), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(daysBetween('2026-02-27', '2026-03-02'), 3);
  assert.equal(dueDateFor('2026-02', 30), '2026-02-28');
  assert.equal(dueDateFor('2026-11', 10), '2026-11-10');
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-02-28'), true);
  assert.equal(isValidMonth('2026-13'), false);
  assert.equal(fmtDate('2026-11-05'), '05/11/2026');
  assert.equal(fmtMonth('2026-03'), 'março de 2026');
  // 01:30 UTC ainda é "ontem" em Brasília (UTC-3)
  assert.equal(todayISO(new Date('2026-11-05T01:30:00Z')), '2026-11-04');
  assert.equal(todayISO(new Date('2026-11-05T12:00:00Z')), '2026-11-05');
});

import { withSslMode } from '../src/lib/db';

test('withSslMode só relaxa a validação do certificado para Supabase ou quando pedido', () => {
  const neon = 'postgres://u:p@ep-x.sa-east-1.aws.neon.tech/db?sslmode=require';
  assert.equal(withSslMode(neon, {}), neon);
  const supa = 'postgres://postgres.abc:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
  assert.match(withSslMode(supa, {}), /sslmode=no-verify/);
  assert.match(withSslMode(neon, { DATABASE_SSL: 'no-verify' }), /sslmode=no-verify/);
  assert.equal(withSslMode('postgres://cf:cf@localhost:5432/condo', {}), 'postgres://cf:cf@localhost:5432/condo');
  assert.equal(withSslMode('', {}), '');
});
