/**
 * Klient DELETE dla /api/upload — wspoldzielony przez edytory panelu.
 *
 * Wczesniej istnialy dwie identyczne kopie (FieldsForm.tsx i PostsEditor.tsx), ktore
 * trzeba bylo utrzymywac zgodnie z kontraktem FILENAME_RE w route.ts. Jedno zrodlo.
 *
 * UWAGA — kiedy TEGO NIE wolac: przy PODMIANIE zdjecia na nowe. Klucz R2 jest
 * deterministyczny, wiec upload nadpisuje stary obiekt w miejscu i nie ma czego
 * kasowac. Skasowanie pliku po podmianie zepsulo by zdjecie na juz opublikowanej
 * stronie, ktora wskazuje na ten sam URL az do nastepnej publikacji.
 * Wolac wylacznie przy TRWALYM usunieciu encji (karta portfolio, okladka publikacji).
 */
export async function deleteUploadBestEffort(imageUrl: string | undefined): Promise<void> {
  if (!imageUrl) return

  // Obcina ?v=<wersja> dodawane przez POST — DELETE oczekuje samej nazwy pliku.
  const filename = imageUrl.split('?')[0].split('/').pop()
  if (!filename) return

  try {
    await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      // Zadanie ma dojsc nawet jesli uzytkownik zaraz potem zamknie karte lub
      // przejdzie dalej — bez tego przegladarka anuluje je w locie i plik zostaje
      // osierocony w R2.
      keepalive: true,
    })
  } catch {
    // Osierocony plik akceptujemy — nieudane sprzatanie nie moze blokowac edycji.
  }
}
