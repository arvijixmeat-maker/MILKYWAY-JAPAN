const fs = require('fs');

const path = 'c:\\Users\\agape_ibeel\\Desktop\\Milkyway JAPAN\\src\\pages\\AdminReservationManage.tsx';

try {
    const content = fs.readFileSync(path, 'utf-8');
    const lines = content.split('\n');

    // Line 1113 is index 1112.
    // Verify it is "// Filter Logic"
    console.log(`Line 1113 content: ${lines[1112]}`);

    if (lines[1112].trim() === '// Filter Logic') {
        const insertion = [
            '',
            '    useEffect(() => {',
            '        fetchReservations();',
            '    }, []);',
            ''
        ];

        // Insert before index 1112
        lines.splice(1112, 0, ...insertion);

        fs.writeFileSync(path, lines.join('\n'), 'utf-8');
        console.log('File updated.');
    } else {
        console.error('Line 1113 match failed. Content:', lines[1112]);
    }

} catch (err) {
    console.error(err);
}
