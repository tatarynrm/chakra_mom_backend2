const xlsx = require('xlsx');
const path = require('path');

// Динамічний шлях до файлу
const filePath = path.join(__dirname, 'job.xlxs');  // __dirname — це поточна директорія скрипта
// Читаємо файл Excel
const workbook = xlsx.readFile('');
const sheet = workbook.Sheets[workbook.SheetNames[0]];  // перший лист

// Конвертуємо дані з листа в масив об'єктів
const data = xlsx.utils.sheet_to_json(sheet);

// Проходимо через кожен рядок і обробляємо дані
const processedData = data.map(row => {
    // Обробка локацій (якщо присутні)
    const [location_from, location_to] = row['Львів-моршин'] ? row['Львів-моршин'].split('-') : [null, null];

    // Обробка ціни та кількості (якщо присутні)
    const [price, count] = row['1700-200'] ? row['1700-200'].split('-').map(Number) : [null, null];

    // Обробка даних про власника вантажу (якщо присутні)
    const cargo_owner = row['настя +380673404913'] ? row['настя +380673404913'].split(' ') : [null, null];

    // Обробка даних про водія (якщо присутні)
    const driver = row['клімов саша 0677047231'] ? row['клімов саша 0677047231'].split(' ') : [null, null];

    // Обробка даних про машину (якщо присутні)
    const truck = row['ман вс 8735ма вс 1566хм'] || null;

    // Обробка даних про власника машини (якщо присутні)
    const truck_owner = row['ярослав +380677630777'] ? row['ярослав +380677630777'].split(' ') : [null, null];

    // Форматуємо дату до YYYY-MM-DD (якщо присутня)
    const date = row['дата'] ? new Date(row['дата']) : null;
    const cargo_date = date ? date.toISOString().split('T')[0] : null;

    return {
        cargo_date,
        location_from,
        location_to,
        price,
        count,
        cargo_owner: cargo_owner[0] || null, // ім'я власника вантажу
        cargo_owner_phone: cargo_owner[1] || null, // телефон власника вантажу
        driver: driver[0] || null, // ім'я водія
        driver_phone: driver[1] || null, // телефон водія
        truck,
        truck_owner: truck_owner[0] || null, // ім'я власника машини
        truck_owner_phone: truck_owner[1] || null // телефон власника машини
    };
});

// Запис результатів у новий файл
const newSheet = xlsx.utils.json_to_sheet(processedData);
const newWorkbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Processed Data');

// Записуємо у файл
xlsx.writeFile(newWorkbook, 'processed_file.xlsx');

console.log('Дані успішно оброблено!');