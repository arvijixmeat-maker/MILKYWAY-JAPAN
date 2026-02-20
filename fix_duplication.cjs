const fs = require('fs');

const path = 'c:\\Users\\agape_ibeel\\Desktop\\Milkyway JAPAN\\src\\pages\\AdminReservationManage.tsx';

try {
    const content = fs.readFileSync(path, 'utf-8');
    const lines = content.split('\n');

    console.log(`Line 1113 content: ${lines[1112]}`);
    console.log(`Line 1317 content: ${lines[1316]}`);

    // Keep lines BEFORE index 1112 (i.e. 0 to 1111).
    const part1 = lines.slice(0, 1112);

    // Keep lines STARTING at index 1316 (Line 1317 " // Filter Logic").
    const part2 = lines.slice(1316);

    const newContent = [...part1, ...part2].join('\n');

    fs.writeFileSync(path, newContent, 'utf-8');
    console.log('File updated.');

} catch (err) {
    console.error(err);
}
