# NotesPlus — Mini Marka Rehberi

## Fikir

Logo, bir not sayfası ile “artı” işaretini tek bir silüette birleştirir. Kıvrılmış sağ üst köşe yeni bir sayfayı; artı biçimindeki negatif alan ise ekleme, geliştirme ve üretkenliği temsil eder.

## Ana dosyalar

- `notesplus-app-icon-1024.png`: iOS / App Store için 1024 × 1024 px, alfa kanalı olmayan ana ikon.
- `notesplus-app-icon-master.png`: yüksek çözünürlüklü kaynak görsel.
- `notesplus-wordmark.png`: şeffaf arka planlı yatay logo ve özel kelime işareti.

## Renkler

| Rol | Renk | Hex |
| --- | --- | --- |
| Ana koyu | Midnight Indigo | `#11104A` |
| Vurgu | NotesPlus Violet | `#6C3CF0` |
| Açık yüzey | Warm Paper | `#FFF9ED` |
| Uygulama zemini | Soft Lilac | `#F4F1FF` |

Koyu lacivert güven ve odağı, mor ise yaratıcılık ve “plus” fikrini taşır. Açık yüzeylerde ana yazı için `#11104A`, koyu yüzeylerde `#FFF9ED` kullanın.

## Tipografi

Kelime işareti, yuvarlatılmış humanist-geometrik bir sans serif karakteriyle özel olarak çizilmiştir. Harf yapısı sakin, modern ve küçük boyutta okunaklıdır; “Notes” koyu lacivert, “Plus” mor kullanılır.

Uygulama arayüzünde Apple sistem fontunu kullanın:

- Büyük başlıklar: SF Pro Rounded, Semibold
- Başlıklar ve butonlar: SF Pro Rounded, Medium / Semibold
- Uzun metin ve not içeriği: SF Pro Text, Regular
- Sayılar ve sayaçlar: SF Pro Rounded, Medium

SwiftUI örneği: `.font(.system(.title2, design: .rounded, weight: .semibold))`

Apple dışı tanıtım materyallerinde yakın eşleşme olarak **Manrope** kullanılabilir; başlıklarda Semibold, metinde Regular önerilir.

## Kullanım

- İkonu yeniden yuvarlatmayın; iOS köşe maskesini kendisi uygular.
- Wordmark çevresinde en az ikon içindeki artı kolunun kalınlığı kadar boşluk bırakın.
- Wordmark'ı dar alana sıkıştırmayın veya harf aralığını değiştirmeyin.
- Çok küçük alanlarda yatay wordmark yerine yalnızca uygulama ikonunu kullanın.
- Fotoğraf üzerinde kullanırken okunurluğu korumak için sade, yüksek kontrastlı bir bölge seçin.

