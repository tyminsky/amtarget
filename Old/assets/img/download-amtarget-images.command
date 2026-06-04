#!/bin/bash
# Завантажує по одному фото товару на кожен тип товару з amtarget.net
# у цю ж папку. Двічі клацніть по файлу, щоб запустити (macOS).
# Якщо буде попередження безпеки: ПКМ -> Відкрити -> Відкрити.

cd "$(dirname "$0")" || exit 1
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Safari/605.1"

echo "Завантаження фото категорій AMTarget у: $(pwd)"
echo

# назва_файлу|URL повнорозмірного фото|опис категорії
items=(
"misheni-gongy.jpg|https://amtarget.net/wp-content/uploads/2025/08/gong_combat_sniper.jpg|Мішені-гонги (Гонг CombaT Sniper)"
"trenuvalni-ipsc.jpg|https://amtarget.net/wp-content/uploads/2025/02/ipsc.jpg|Тренувальні IPSC (Гонг IPSC 570x450)"
"poppery-ta-ruhomi.jpg|https://amtarget.net/wp-content/uploads/2025/02/popper_1.jpg|Поппери та рухомі (Мішенева установка Поппер)"
"stendy-ta-trynogy.jpg|https://amtarget.net/wp-content/uploads/2025/05/tr-m.jpg|Стенди та триноги (Тринога TR-M)"
"kuleulovlyuvachi.jpg|https://amtarget.net/wp-content/uploads/2025/02/bullet_hard_1.jpg|Кулеуловлювачі (Кулеуловлювач HarD)"
"speczialni-texas-star.jpg|https://amtarget.net/wp-content/uploads/2025/08/texas_star_.jpg|Спеціальні (Мішенева установка Texas Star)"
)

ok=0
for row in "${items[@]}"; do
  name="${row%%|*}"
  rest="${row#*|}"
  url="${rest%%|*}"
  desc="${rest#*|}"
  printf "→ %-26s %s\n" "$name" "$desc"
  if curl -fSL -A "$UA" -o "$name" "$url"; then
    ok=$((ok+1))
  else
    echo "   ⚠️  не вдалося завантажити: $url"
  fi
done

echo
echo "Готово: завантажено $ok з ${#items[@]} фото."
echo "Натисніть Enter, щоб закрити."
read -r _
