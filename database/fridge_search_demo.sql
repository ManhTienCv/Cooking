-- File nÃ y lÆ°u láº¡i cáº¥u trÃºc SQL máº«u dÃ¹ng cho tÃ­nh nÄƒng "TÃ¬m kiáº¿m theo nguyÃªn liá»‡u Tá»§ láº¡nh" (Fridge Clearing Search).
-- Há»‡ thá»‘ng sáº½ tá»± Ä‘á»™ng ghÃ©p thÃªm cÃ¡c dÃ²ng CASE WHEN tÆ°Æ¡ng á»©ng vá»›i sá»‘ lÆ°á»£ng nguyÃªn liá»‡u mÃ  ngÆ°á»i dÃ¹ng nháº­p vÃ o.
-- Báº¡n cÃ³ thá»ƒ lÆ°u láº¡i file nÃ y Ä‘á»ƒ Ä‘áº£m báº£o Ä‘á»§ dá»¯ liá»‡u khi chia sáº» code cho báº¡n bÃ¨.

-- VÃ­ dá»¥: Khi ngÆ°á»i dÃ¹ng gÃµ tÃ¬m 3 nguyÃªn liá»‡u: 'trá»©ng', 'cÃ  chua', 'hÃ nh lÃ¡'
-- Query thá»±c táº¿ trÃªn Node.js sáº½ Ä‘Æ°á»£c sinh ra nhÆ° sau:

SELECT 
    r.id,
    r.title,
    r.ingredients,
    r.description,
    r.image_url,
    r.views,
    r.calories,
    c.name AS category_name,
    u.full_name AS author_name,
    (
        (CASE WHEN r.ingredients ILIKE '%trá»©ng%' THEN 1 ELSE 0 END) +
        (CASE WHEN r.ingredients ILIKE '%cÃ  chua%' THEN 1 ELSE 0 END) +
        (CASE WHEN r.ingredients ILIKE '%hÃ nh lÃ¡%' THEN 1 ELSE 0 END)
    ) AS match_count
FROM recipes r
LEFT JOIN recipe_categories c ON r.category_id = c.id
LEFT JOIN users u ON r.author_id = u.id
WHERE r.status = 'approved'
  AND (
        r.ingredients ILIKE '%trá»©ng%' OR 
        r.ingredients ILIKE '%cÃ  chua%' OR 
        r.ingredients ILIKE '%hÃ nh lÃ¡%'
  )
ORDER BY match_count DESC, r.views DESC
LIMIT 20 OFFSET 0;
