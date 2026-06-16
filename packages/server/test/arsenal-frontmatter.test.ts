import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/arsenal/frontmatter.js';

describe('parseFrontmatter', () => {
  it('wyciąga name i description z bloku ---', () => {
    const md = `---\nname: brainstorming\ndescription: Pomysł w projekt\n---\n# Body`;
    expect(parseFrontmatter(md)).toEqual({ name: 'brainstorming', description: 'Pomysł w projekt' });
  });

  it('toleruje brak frontmattera', () => {
    expect(parseFrontmatter('# tylko body')).toEqual({});
  });

  it('bierze tylko pierwszą wartość po dwukropku i trzyma resztę linii', () => {
    const md = `---\nname: code-review\ndescription: Review a PR: correctness\n---`;
    expect(parseFrontmatter(md)).toEqual({ name: 'code-review', description: 'Review a PR: correctness' });
  });
});
