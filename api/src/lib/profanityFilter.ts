/**
 * Tên file: profanityFilter.ts
 * Công dụng: Lọc từ ngữ nhạy cảm/tục tĩu trong nội dung bình luận.
 * Chức năng:
 * - Kiểm tra xem nội dung có chứa từ khóa xấu không.
 * - Thay thế từ khóa xấu bằng dấu ***.
 * - Hỗ trợ cả tiếng Việt và tiếng Anh.
 */

/* Mạnh Tiến */

// Danh sách từ khóa bị cấm (viết thường, không dấu để so khớp dễ hơn)
const BANNED_WORDS: string[] = [
  // Tiếng Việt phổ biến
  'dit', 'đít', 'deo', 'đéo', 'dcm', 'dm', 'dmm', 'đmm', 'vcl', 'vl', 'vkl',
  'clgt', 'cặc', 'cac', 'buoi', 'buồi', 'lon', 'lồn', 'đụ', 'du ma', 'đù',
  'chó', 'ngu', 'đần', 'khốn', 'mặt lol', 'thằng ngu', 'con ngu',
  'cc', 'cl', 'ml', 'wtf', 'đkm', 'dkm',
  // Tiếng Anh phổ biến
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'damn', 'bastard',
  'motherfucker', 'nigger', 'cunt', 'slut', 'whore',
];

/**
 * Chuẩn hóa chuỗi: bỏ dấu tiếng Việt, viết thường.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Kiểm tra nội dung có chứa từ ngữ xấu không.
 * @returns true nếu nội dung SẠCH (không có từ cấm).
 */
function isClean(text: string): boolean {
  const normalized = normalize(text);
  // Tách thành mảng từ và kiểm tra từng từ
  const words = normalized.split(/\s+/);
  for (const banned of BANNED_WORDS) {
    const normalizedBanned = normalize(banned);
    // Kiểm tra cả cụm từ (nguyên câu) và từ đơn
    if (normalizedBanned.includes(' ')) {
      if (normalized.includes(normalizedBanned)) return false;
    } else {
      if (words.includes(normalizedBanned)) return false;
    }
  }
  return true;
}

/**
 * Thay thế từ ngữ xấu bằng dấu ***.
 * Giữ nguyên các ký tự không bị cấm.
 */
function censor(text: string): string {
  let result = text;
  const normalizedText = normalize(text);

  for (const banned of BANNED_WORDS) {
    const normalizedBanned = normalize(banned);
    // Tìm vị trí của từ cấm trong bản normalized và thay thế ở bản gốc
    const regex = new RegExp(escapeRegex(normalizedBanned), 'gi');
    const normalizedResult = normalize(result);
    let match: RegExpExecArray | null;
    const replacements: { start: number; end: number }[] = [];

    while ((match = regex.exec(normalizedResult)) !== null) {
      replacements.push({ start: match.index, end: match.index + match[0].length });
    }

    // Áp dụng thay thế từ cuối lên đầu để không sai vị trí
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { start, end } = replacements[i]!;
      result = result.slice(0, start) + '***' + result.slice(end);
    }
  }
  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Kiểm tra nhanh và trả về { clean, filtered } */
export function filterContent(text: string): { clean: boolean; filtered: string } {
  const clean = isClean(text);
  return { clean, filtered: clean ? text : censor(text) };
}
