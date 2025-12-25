import { SolarDate, LunarDate } from 'lunar-date-vn';

// Mapping 12 con giáp với emoji
const ZODIAC_ICONS: Record<string, string> = {
  'Tý': '🐭',    // Chuột
  'Sửu': '🐂',   // Trâu
  'Dần': '🐅',   // Hổ
  'Mão': '🐰',   // Mèo
  'Thìn': '🐲',  // Rồng
  'Tỵ': '🐍',    // Rắn
  'Ngọ': '🐴',   // Ngựa
  'Mùi': '🐑',   // Dê
  'Thân': '🐵',  // Khỉ
  'Dậu': '🐓',   // Gà
  'Tuất': '🐕',  // Chó
  'Hợi': '🐷'    // Lợn
};

/**
 * Lấy con giáp từ tên năm can chi
 */
function getZodiacFromYearName(yearName: string): string {
  // Tên năm có format "Can Chi" (ví dụ: "Ất Tỵ")
  const parts = yearName.split(' ');
  if (parts.length >= 2) {
    const chi = parts[parts.length - 1]; // Lấy phần cuối (con giáp)
    return ZODIAC_ICONS[chi] || '';
  }
  return '';
}

/**
 * Chuyển đổi ngày dương lịch sang âm lịch Việt Nam
 * @param date - Ngày dương lịch
 * @returns Chuỗi hiển thị âm lịch (ví dụ: "15 - Giêng - Giáp Thìn 🐲")
 */
export function getVietnameseLunarDate(date: Date): string {
  try {
    const solar = new SolarDate(date);
    const lunar = solar.toLunarDate();
    
    // Tên các tháng âm lịch
    const lunarMonths = [
      'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu',
      'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'
    ];
    
    // Format: "X - Y - Z 🐲" (ví dụ: "15 - Giêng - Ất Tỵ 🐍")
    const lunarDay = lunar.day;
    const lunarMonth = lunarMonths[lunar.month - 1] || `${lunar.month}`;
    const lunarYearName = lunar.getYearName();
    const zodiacIcon = getZodiacFromYearName(lunarYearName);
    
    return `${lunarDay} - ${lunarMonth} - ${lunarYearName} ${zodiacIcon}`;
  } catch (error) {
    console.error('Error converting to lunar calendar:', error);
    return '';
  }
}

/**
 * Lấy ngày âm lịch dạng ngắn gọn (ví dụ: "15/8")
 */
export function getVietnameseLunarDateShort(date: Date): string {
  try {
    const solar = new SolarDate(date);
    const lunar = solar.toLunarDate();
    
    return `${lunar.day}/${lunar.month}`;
  } catch (error) {
    console.error('Error converting to lunar calendar:', error);
    return '';
  }
}

