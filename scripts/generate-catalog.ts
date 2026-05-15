import { writeCatalogFile } from '../lib/data/build-catalog';

writeCatalogFile()
  .then((catalog) => {
    console.log(
      `[catalog] ${catalog.sections.length} sections, ${catalog.questions.length} questions → lib/data/catalog.generated.json`,
    );
  })
  .catch((err) => {
    console.error('[catalog] failed:', err);
    process.exit(1);
  });
