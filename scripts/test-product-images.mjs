import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/utils/productImage.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { productImageUrl, productImageSet } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const path = '/api/images/product-details/example.webp';
assert(productImageUrl(path, 248).includes('width=320,'));
assert(productImageUrl(path, 860).includes('width=960,'));
assert(productImageUrl(path, 20000).includes('width=1720,'));
assert(productImageUrl(path).includes('fit=scale-down/api/images/'));
assert.equal(productImageUrl(`https://mongolryokou.com${path}`), productImageUrl(path));
assert.equal(productImageUrl(`https://branch.milkyway-japan-axy.pages.dev${path}`), productImageUrl(path));
for (const src of ['data:image/png;base64,AA==', '/assets/logo.png', 'https://example.com/api/images/photo.png']) {
    assert.equal(productImageUrl(src), src);
    assert.equal(productImageSet(src), undefined);
}
assert.equal(productImageSet(path).split(', ').length, 6);
console.log('Product image URL and responsive source tests passed.');
