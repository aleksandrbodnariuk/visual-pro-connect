import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csvExport.ts';

test('uses semicolon and BOM', () => { assert.equal(toCsv([['a', 1]]), '\uFEFFa;1'); });
test('quotes separators and quotes', () => { assert.equal(toCsv([['a;b', 'x"y']]), '\uFEFF"a;b";"x""y"'); });
test('neutralises formulas', () => { assert.equal(toCsv([['=SUM(A1)']]), "\uFEFF'=SUM(A1)"); });
