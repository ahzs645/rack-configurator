import { readdir, readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
const zip = new JSZip();
for (const folder of ['components', 'rack_mounts']) {
  for (const name of (await readdir(`public/${folder}`)).filter(n => n.endsWith('.scad')).sort()) {
    zip.file(`${folder}/${name}`, await readFile(`public/${folder}/${name}`), { date: new Date('2020-01-01T00:00:00Z') });
  }
}
await writeFile('public/rack-scad.zip', await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log('Built rack-scad.zip from current SCAD sources.');
