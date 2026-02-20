const fs = require('fs');

const path = 'c:\\Users\\agape_ibeel\\Desktop\\Milkyway JAPAN\\src\\pages\\AdminReservationManage.tsx';

try {
    const content = fs.readFileSync(path, 'utf-8');
    const lines = content.split('\n');

    // Line 1520 is index 1519.
    const targetLineIndex = 1519;
    const targetLine = lines[targetLineIndex];

    console.log(`Line 1520 content: ${targetLine}`);

    if (targetLine.includes('}} product_name')) {
        // Truncate at }}
        // Find index of }}
        // Actually, we want to keep "}}"
        // The line likely looks like: "                    }} product_name: ..."
        const splitIndex = targetLine.indexOf('}}') + 2;
        lines[targetLineIndex] = targetLine.substring(0, splitIndex);

        // Now delete lines 1521 to 1565.
        // Index 1520 to 1564. (1-based 1521 to 1565).
        // Check line 1565 (index 1564) content to be sure.
        console.log(`Line 1565 content: ${lines[1564]}`);

        if (lines[1564].trim() === '}}') {
            // Delete from index 1520, count = (1564 - 1520 + 1) = 45 lines.
            lines.splice(1520, 45);

            fs.writeFileSync(path, lines.join('\n'), 'utf-8');
            console.log('File updated.');
        } else {
            console.error('Line 1565 match failed (expected "}}"). Content:', lines[1564]);
            // Maybe line numbers shifted?
            // Let's just verify range visually from previous tool output.
            // 1521 ... 1565.
            // 1565 was "                    }}".
            // 1566 was "            />".
            // If we delete 1520...1564, then index 1519 (truncated) is followed by index 1565 (original).
            // Which becomes new index 1520.
            // Original 1566 becomes new 1520?
            // No. splice removes in place.
        }
    } else {
        console.error('Line 1520 match failed. Content:', targetLine);
    }

} catch (err) {
    console.error(err);
}
