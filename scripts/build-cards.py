"""
Build src/data/cards.json from the source spreadsheet.

Kept in the repo so regenerating the deck from an updated spreadsheet is one
command rather than a hand-edit of 50 JSON objects:

    python3 scripts/build-cards.py ~/Desktop/"Indi-Q 50.xlsx"

Spreadsheet columns map to categories in order:
    Person | Places | Object | Movie | Nature | Random
"""
import json, sys
import openpyxl

CATEGORIES = ['People', 'Location', 'Object', 'Movie', 'Nature', 'Random']

# Unambiguous spelling corrections applied to the source. Only entries whose
# intended word is unmistakable — variant transliterations are left alone.
TYPO_FIXES = {
    'Elelphant': 'Elephant',
    'SIlkworm': 'Silkworm',
    'Tumeric': 'Turmeric',
    'Corriander': 'Coriander',
    'Cinamon stick': 'Cinnamon stick',
    'Cardamon': 'Cardamom',
    'Virat Kholi': 'Virat Kohli',
    'Arjit Singh': 'Arijit Singh',
    'Vasco Da Gamma': 'Vasco Da Gama',
    'Veerapan': 'Veerappan',
    'Amir Khan': 'Aamir Khan',
    'Byjus': "Byju's",
    'Vade Bharat Express': 'Vande Bharat Express',
    'Mwogli': 'Mowgli',
    'Taare Zaameen Par': 'Taare Zameen Par',
    'Rab Ne Bana De Jodi': 'Rab Ne Bana Di Jodi',
    'Chathikyatha Chandhu': 'Chathikkatha Chanthu',
    'Kadamutathe Kathanar': 'Kadamattathu Kathanar',
    'Munaar': 'Munnar',
    'Chaiiwala': 'Chaiwala',
    'Poppy Kuda': 'Popy Kuda',
}

# Malayalam for every word. Proper nouns are transliterated; common nouns use
# the actual Malayalam term (Elephant -> ആന, not a transliteration).
ML = {
  # ── People ──
  'Mahatma Gandhi':'മഹാത്മാ ഗാന്ധി','Vikram':'വിക്രം','Rajinikanth':'രജിനികാന്ത്',
  'St. Thomas':'സെന്റ് തോമസ്','Mohanlal':'മോഹൻലാൽ','Mammootty':'മമ്മൂട്ടി','Dileep':'ദിലീപ്',
  "Byju's":'ബൈജൂസ്','Vasco Da Gama':'വാസ്കോ ഡ ഗാമ','Veerappan':'വീരപ്പൻ',
  'Narendra Modi':'നരേന്ദ്ര മോദി','A P J Abdul Kalam':'എ പി ജെ അബ്ദുൾ കലാം',
  'Manmohan Singh':'മൻമോഹൻ സിംഗ്','Sachin Tendulkar':'സച്ചിൻ ടെണ്ടുൽക്കർ',
  'Mahendra Singh Dhoni':'മഹേന്ദ്ര സിംഗ് ധോണി','Virat Kohli':'വിരാട് കോലി',
  'A R Rahman':'എ ആർ റഹ്മാൻ','Arijit Singh':'അരിജിത് സിംഗ്','P V Sindhu':'പി വി സിന്ധു',
  'Minnal Murali':'മിന്നൽ മുരളി','Fahadh Faasil':'ഫഹദ് ഫാസിൽ','Tovino Thomas':'ടൊവിനോ തോമസ്',
  'Shaktimaan':'ശക്തിമാൻ','Chhota Bheem':'ഛോട്ടാ ഭീം','Thirumali':'തിരുമാലി',
  'Rakesh Sharma':'രാകേഷ് ശർമ','Milkha Singh':'മിൽഖാ സിംഗ്','Nora Fatehi':'നോറ ഫതേഹി',
  'Aishwarya Rai':'ഐശ്വര്യ റായ്','Amitabh Bachchan':'അമിതാഭ് ബച്ചൻ','Mukesh Ambani':'മുകേഷ് അംബാനി',
  'Ratan Tata':'രത്തൻ ടാറ്റ','Shah Rukh Khan':'ഷാരൂഖ് ഖാൻ','Aamir Khan':'ആമിർ ഖാൻ',
  'Hrithik Roshan':'ഹൃതിക് റോഷൻ','Kumail Nanjiani':'കുമൈൽ നൻജിയാനി','Dev Patel':'ദേവ് പട്ടേൽ',
  'Guru Nanak':'ഗുരു നാനാക്ക്','Vijay':'വിജയ്','Prabhu Deva':'പ്രഭു ദേവ','Ram Charan':'രാം ചരൺ',
  'Kadamattathu Kathanar':'കടമറ്റത്ത് കത്തനാർ','Ganapati':'ഗണപതി','Raj Koothrappali':'രാജ് കൂത്രപ്പാളി',
  'Russell Peters':'റസ്സൽ പീറ്റേഴ്സ്','Romesh Ranganathan':'രമേഷ് രംഗനാഥൻ','Hasan Minhaj':'ഹസൻ മിൻഹാജ്',
  'Kal Penn':'കാൽ പെൻ','Aziz Ansari':'അസീസ് അൻസാരി','Dulquer Salmaan':'ദുൽഖർ സൽമാൻ',
  # ── Location ──
  'Taj Mahal':'താജ് മഹൽ','Delhi':'ഡൽഹി','Mumbai':'മുംബൈ','Mysore Palace':'മൈസൂർ കൊട്ടാരം',
  'Chaiwala':'ചായവാല','Tonico Cafe':'ടോണികോ കഫേ','28 States':'28 സംസ്ഥാനങ്ങൾ',
  'Kumarakom':'കുമരകം','Thrissur':'തൃശ്ശൂർ','Chalakudy':'ചാലക്കുടി','Kottayam':'കോട്ടയം',
  'Andaman And Nicobar':'ആൻഡമാൻ നിക്കോബാർ','Manali':'മണാലി','Red Fort':'ചെങ്കോട്ട',
  'Leh - Ladak':'ലേ - ലഡാക്ക്','Kashmir':'കാശ്മീർ','Golden Temple':'സുവർണ ക്ഷേത്രം',
  'Malabar':'മലബാർ','Mullaperiyar Dam':'മുല്ലപ്പെരിയാർ അണക്കെട്ട്','India Gate':'ഇന്ത്യാ ഗേറ്റ്',
  'Agra Fort':'ആഗ്ര കോട്ട','Ajanta Caves':'അജന്ത ഗുഹകൾ','Wayanad':'വയനാട്',
  'Qutab Minar':'കുത്തബ് മിനാർ','Lotus Temple':'ലോട്ടസ് ടെമ്പിൾ','Chandni Chowk':'ചാന്ദ്നി ചൗക്ക്',
  'Kuttanad':'കുട്ടനാട്','Nalanda University':'നളന്ദ സർവകലാശാല','Pangong Lake':'പാംഗോങ് തടാകം',
  'Dhanushkodi':'ധനുഷ്കോടി','Ram Mandir':'രാമ മന്ദിർ','Chandigarh':'ചണ്ഡീഗഢ്',
  'Eden Gardens':'ഈഡൻ ഗാർഡൻസ്','Chidambaram Stadium':'ചിദംബരം സ്റ്റേഡിയം',
  'Wankhede Stadium':'വാങ്കഡെ സ്റ്റേഡിയം','Jaipur':'ജയ്പൂർ','Ernakulam':'എറണാകുളം',
  'Trivandrum':'തിരുവനന്തപുരം','Dharamshala Stadium':'ധർമ്മശാല സ്റ്റേഡിയം','Tamilnadu':'തമിഴ്നാട്',
  'Chennai':'ചെന്നൈ','Cochin':'കൊച്ചി','Bangalore':'ബെംഗളൂരു','Slums':'ചേരി','Shaap':'ഷാപ്പ്',
  'Dharavi':'ധാരാവി','Paathalam':'പാതാളം','Kanchipuram':'കാഞ്ചീപുരം','Munnar':'മൂന്നാർ',
  'Himachal Pradesh':'ഹിമാചൽ പ്രദേശ്',
  # ── Object ──
  'Jio':'ജിയോ','Kindi':'കിണ്ടി','Airtel':'എയർടെൽ','Broasted':'ബ്രോസ്റ്റഡ്',
  'Filter Coffee':'ഫിൽട്ടർ കോഫി','KSRTC Bus':'കെഎസ്ആർടിസി ബസ്','Vande Bharat Express':'വന്ദേ ഭാരത് എക്സ്പ്രസ്',
  'Ashoka Chakra':'അശോക ചക്രം','Chandrayaan Satellite':'ചന്ദ്രയാൻ ഉപഗ്രഹം','Federal Bank':'ഫെഡറൽ ബാങ്ക്',
  'Santosh Brami':'സന്തോഷ് ബ്രാഹ്മി','Popy Kuda':'പോപ്പി കുട','Urli':'ഉരുളി','Mandakini':'മന്ദാകിനി',
  'Kirpan':'കൃപാൺ','Dandiya Sticks':'ദാണ്ഡിയ വടികൾ','Morpheus':'മോർഫിയസ്','Cricket Bat':'ക്രിക്കറ്റ് ബാറ്റ്',
  'Jockey':'ജോക്കി','Stitch ball':'സ്റ്റിച്ച് ബോൾ','GPay':'ജിപേ','Vatte':'വട്ട','Stumps':'സ്റ്റംപ്സ്',
  'Royal Enfield':'റോയൽ എൻഫീൽഡ്','Kopiko':'കോപ്പിക്കോ','Helmet':'ഹെൽമെറ്റ്','Toddy':'കള്ള്',
  'Ball Ice Cream':'ബോൾ ഐസ്ക്രീം','Vadam':'വടം','Air India':'എയർ ഇന്ത്യ','House Boat':'ഹൗസ് ബോട്ട്',
  'Turban':'തലപ്പാവ്','Kohinoor':'കോഹിനൂർ','Silk':'പട്ട്','Saree':'സാരി','Lungi':'ലുങ്കി',
  'Closeup Toothpaste':'ക്ലോസപ്പ് ടൂത്ത്പേസ്റ്റ്','Cricket':'ക്രിക്കറ്റ്','Football':'ഫുട്ബോൾ',
  'Tandoor':'തന്തൂർ','Kingfisher Beer':'കിംഗ്ഫിഷർ ബിയർ','Tawa':'തവ','Halwa':'ഹൽവ',
  'Himalayan Salt':'ഹിമാലയൻ ഉപ്പ്','Mandi':'മന്ദി','Auto Rickshaw':'ഓട്ടോറിക്ഷ','Bru Coffee':'ബ്രൂ കോഫി',
  'Tiffin Box':'ടിഫിൻ ബോക്സ്','Dabba':'ഡബ്ബ','Mylanchi':'മൈലാഞ്ചി',
  # ── Movie ──
  'Dhoom':'ധൂം','No. 20 Madras Mail':'നമ്പർ 20 മദ്രാസ് മെയിൽ','Manichitrathazhu':'മണിച്ചിത്രത്താഴ്',
  'Narasimham':'നരസിംഹം','Yodha':'യോദ്ധാ','RRR':'ആർആർആർ','Koi Mil Gaya':'കോയി മിൽ ഗയാ',
  'Rab Ne Bana Di Jodi':'രബ് നേ ബനാ ദി ജോഡി','3 Idiots':'3 ഇഡിയറ്റ്സ്','Taare Zameen Par':'താരേ സമീൻ പർ',
  'Life of Pi':'ലൈഫ് ഓഫ് പൈ','Slumdog Millionaire':'സ്ലംഡോഗ് മില്യണയർ','Romancham':'റൊമാഞ്ചം',
  'Manjummel Boys':'മഞ്ഞുമ്മൽ ബോയ്സ്','Jodhaa Akbar':'ജോധാ അക്ബർ','Lagaan':'ലഗാൻ','Guzaarish':'ഗുസാരിഷ്',
  'Kabhi Khushi Kabhie Gham':'കഭി ഖുഷി കഭി ഗം','KGF':'കെജിഎഫ്','Baahubali':'ബാഹുബലി',
  'Kalyanaraman':'കല്യാണരാമൻ','CID Moosa':'സിഐഡി മൂസ','Chathikkatha Chanthu':'ചതിക്കാത്ത ചന്തു',
  '83':'83','Lucifer':'ലൂസിഫർ','Vettam':'വേട്ടം','Runway':'റൺവേ','Chotta Mumbai':'ഛോട്ടാ മുംബൈ',
  'Thattathin Marayathu':'തട്ടത്തിൻ മറയത്ത്','Sivaji The Boss':'ശിവാജി ദി ബോസ്','Punjabi House':'പഞ്ചാബി ഹൗസ്',
  '2018':'2018','Chennai Express':'ചെന്നൈ എക്സ്പ്രസ്','Vaaranam Aayiram':'വാരണം ആയിരം','Ghilli':'ഗില്ലി',
  'Ghajini':'ഗജിനി','Don':'ഡോൺ','Krrish':'കൃഷ്','Chakde India':'ചക് ദേ ഇന്ത്യ','Drishyam':'ദൃശ്യം',
  'Jab We Met':'ജബ് വി മെറ്റ്','Enthiran':'എന്തിരൻ','12th Fail':'12th ഫെയിൽ','Mowgli':'മൗഗ്ലി',
  'The Jungle Book':'ദി ജംഗിൾ ബുക്ക്','Guppy':'ഗപ്പി','Pushpa':'പുഷ്പ','Chemmeen':'ചെമ്മീൻ','Kilukkam':'കിലുക്കം',
  # ── Nature ──
  'Mullapoo':'മുല്ലപ്പൂ','Curry Leaves':'കറിവേപ്പില','Coriander':'മല്ലിയില','Lotus':'താമര',
  'Elephant':'ആന','Bengal Tiger':'ബംഗാൾ കടുവ','King Cobra':'രാജവെമ്പാല','Monkey':'കുരങ്ങ്',
  'Chaala':'ചാള','Periyar River':'പെരിയാർ നദി','Cinnamon stick':'കറുവപ്പട്ട','Snakes':'പാമ്പുകൾ',
  'Cockroach':'പാറ്റ','Palli':'പല്ലി','Minna Minni':'മിന്നാമിന്നി','Thotta Vaadi':'തൊട്ടാവാടി',
  'Jackfruit':'ചക്ക','Mango':'മാങ്ങ','Star Anise':'തക്കോലം','Banana':'പഴം','Poovan Pazham':'പൂവൻ പഴം',
  'Kayal':'കായൽ','Coconut':'തേങ്ങ','Tender Coconut':'ഇളനീർ','Pistachio':'പിസ്ത','Cardamom':'ഏലക്ക',
  'Black Pepper':'കുരുമുളക്','Banana Leaves':'വാഴയില','Spices':'സുഗന്ധവ്യഞ്ജനങ്ങൾ','Sugar cane':'കരിമ്പ്',
  'Silkworm':'പട്ടുനൂൽപ്പുഴു','Red Chilli':'മുളക്','Turmeric':'മഞ്ഞൾ','Cumin':'ജീരകം','Tea Leaves':'തേയില',
  'Fennel':'പെരുംജീരകം','Cashmere Silk':'കാശ്മീർ പട്ട്','Mustard seed':'കടുക്','Inji':'ഇഞ്ചി',
  'Chandanam':'ചന്ദനം','Karimeen':'കരിമീൻ','Monsoon':'മൺസൂൺ','Cobra':'മൂർഖൻ','Python':'പെരുമ്പാമ്പ്',
  'Humidity':'ഈർപ്പം','Tropical':'ഉഷ്ണമേഖല','Neelakurinji':'നീലക്കുറിഞ്ഞി','Tulasi':'തുളസി',
  'Peacock':'മയിൽ','Grain':'ധാന്യം',
  # ── Random ──
  'Idea Star Singer':'ഐഡിയ സ്റ്റാർ സിംഗർ','Chutney':'ചട്ണി','Sambar':'സാമ്പാർ','Parle-G':'പാർലെ-ജി',
  'Rasam':'രസം','Sharjah Shake':'ഷാർജ ഷേക്ക്','Rusk':'റസ്ക്','Ayurvedam':'ആയുർവേദം','Scorpio':'സ്കോർപിയോ',
  'Chai':'ചായ','JAVA':'ജാവ','AMMA':'അമ്മ','Sambal':'സാമ്പൽ','Rummy':'റമ്മി','Music Mojo':'മ്യൂസിക് മോജോ',
  'Coke Studio':'കോക്ക് സ്റ്റുഡിയോ','Kathakali':'കഥകളി','Yoga':'യോഗ','Garba':'ഗർബ','Onam':'ഓണം',
  'KTM Duke':'കെടിഎം ഡ്യൂക്ക്','T20':'ടി20','IPL':'ഐപിഎൽ','Egg Puffs':'എഗ് പഫ്സ്','Murku':'മുറുക്ക്',
  'Kerala Blasters':'കേരള ബ്ലാസ്റ്റേഴ്സ്','Pazham Puri':'പഴംപൊരി','Bribe':'കൈക്കൂലി','Tug of War':'വടംവലി',
  'Santoor':'സന്തൂർ','Lajjavathiye':'ലജ്ജാവതിയേ','East India Company':'ഈസ്റ്റ് ഇന്ത്യ കമ്പനി',
  'Sadhya':'സദ്യ','Achaar':'അച്ചാർ','Haldi':'ഹൽദി','Chaat':'ചാട്ട്','Horlicks':'ഹോർലിക്സ്',
  'Mollywood':'മോളിവുഡ്','Namaste':'നമസ്തേ','Bollywood':'ബോളിവുഡ്','Diwali':'ദീപാവലി','Holi':'ഹോളി',
  'Vallamkali':'വള്ളംകളി','Kebab':'കബാബ്','Samosa':'സമോസ','Samosa Chaat':'സമോസ ചാട്ട്',
  'Channa Bhatura':'ചന്ന ഭട്ടൂര','Al Faham':'അൽ ഫഹം','Nepotism':'സ്വജനപക്ഷപാതം','Fish Nirvana':'ഫിഷ് നിർവാണ',
}

def main(path):
    ws = openpyxl.load_workbook(path, data_only=True)['Sheet1']
    rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if any(r)]

    applied, missing, cards = [], [], []
    for i, row in enumerate(rows):
        words, words_ml = {}, {}
        for cat, raw in zip(CATEGORIES, row):
            w = str(raw).strip()
            if w in TYPO_FIXES:
                applied.append((w, TYPO_FIXES[w]))
                w = TYPO_FIXES[w]
            words[cat] = w
            ml = ML.get(w)
            if ml is None:
                missing.append((cat, w))
            words_ml[cat] = ml or w
        cards.append({
            'id': f'c{i + 1:03d}',
            'words': words,
            'wordsMl': words_ml,
            # Round-robin keeps the ☸ word evenly spread across categories, so
            # no category is over-represented in chakra rounds.
            'chakraCategory': CATEGORIES[i % len(CATEGORIES)],
        })

    with open('src/data/cards.json', 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
        f.write('\n')

    print(f"wrote {len(cards)} cards")
    print(f"typo fixes applied: {len(applied)}")
    for a, b in sorted(set(applied)):
        print(f"    {a!r} -> {b!r}")
    if missing:
        print(f"MISSING Malayalam ({len(missing)}):")
        for cat, w in missing:
            print(f"    {cat}: {w}")
    else:
        print("Malayalam: all 300 words covered")

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/Users/adarshanil/Desktop/Indi-Q 50.xlsx')
