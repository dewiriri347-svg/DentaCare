export interface DiagnosisNeed {
  title: string;
  causes: string[];
  signs: string[];
}

export const DIAGNOSIS_NEEDS: DiagnosisNeed[] = [
  {
    title: "Tidak terpenuhinya kebutuhan akan perlindungan dari resiko kesehatan",
    causes: [
      "Partisipasi dalam olahraga/kegiatan/pekerjaan yang beresiko menimbulkan cedera/gangguan kesehatan",
      "Penggunaan produk kesehatan gigi dan mulut yang tidak tepat",
      "Kurangnya pendidikan atau pengetahuan",
      "Parestesia, anestesia",
      "Kebiasaan buruk",
      "Potensi terjadinya infeksi",
      "Potensi terjadinya cedera mulut",
      "Kekhawatiran pada pengalaman negatif tentang pengendalian infeksi, keamanan radiasi, keamanan fluoride dan sejenisnya",
      "Perilaku atau gaya hidup yang berisiko terhadap kesehatan"
    ],
    signs: [
      "Bukti adanya rujukan segera atau konsultasi dengan seorang dokter mengenai penyakit yang tidak terkontrol",
      "Bukti adanya kebutuhan untuk premedikasi antibiotik",
      "Bukti bahwa klien berisiko terjadinya cedera pada mulut",
      "Bukti bahwa klien berisiko untuk penyakit gigi dan mulut atau penyakit sistemik",
      "Bukti bahwa klien berada dalam situasi yang mengancam hidupnya"
    ]
  },
  {
    title: "Tidak terpenuhinya kebutuhan akan bebas dari ketakutan dan atau stress",
    causes: [
      "Pengalaman negatif perawatan sebelumnya",
      "Takut akan hal yang tidak/belum diketahuinya",
      "Kekurangan biaya/sumber keuangan",
      "Takut akan mahalnya biaya perawatan"
    ],
    signs: [
      "Klien merasa ketakutan",
      "Kekhawatiran klien tentang kerahasiaan, biaya perawatan, penularan penyakit, keracunan fluoride, keracunan merkuri, paparan radiasi"
    ]
  },
  {
    title: "Tidak terpenuhinya kebutuhan akan kesan wajah yang sehat",
    causes: [
      "Menggunakan atau membutuhkan prostesis gigi dan mulut",
      "Penyakit atau gangguan gigi dan mulut yang terlihat",
      "Bau mulut (halitosis)",
      "Maloklusi",
      "Pengguna atau orang yang membutuhkan peralatan ortodontik"
    ],
    signs: [
      "Klien melaporkan ketidakpuasan dengan penampilan giginya",
      "Klien melaporkan ketidakpuasan dengan penampilan gusi/jaringan periodontalnya",
      "Klien melaporkan ketidakpuasan dengan penampilan profil wajahnya",
      "Klien melaporkan ketidakpuasan dengan penampilan prostesis giginya",
      "Klien melaporkan ketidakpuasan dengan aroma napasnya"
    ]
  },
  {
    title: "Tidak terpenuhinya kondisi biologis dan fungsi gigi-geligi yang baik",
    causes: [
      "Infeksi Streptococcus mutans",
      "Nutrisi dan diet yang kurang",
      "Faktor-faktor risiko yang dapat berubah dan tidak dapat diubah",
      "Kurangnya pendidikan kesehatan gigi dan mulut",
      "Kurang pemeliharaan kesehatan gigi dan mulut",
      "Kurang melakukan perawatan/pemeriksaan gigi regular"
    ],
    signs: [
      "Gigi dengan tanda-tanda penyakit",
      "Gigi yang hilang",
      "Rusaknya restorasi",
      "Gigi dengan abrasi atau erosi",
      "Gigi dengan tanda-tanda trauma",
      "Peralatan prostetik yang tidak pas",
      "Kesulitan mengunyah"
    ]
  },
  {
    title: "Tidak terpenuhinya keutuhan kulit dan membran mukosa pada kepala dan leher",
    causes: [
      "Infeksi mikroba dan respon inang",
      "Perilaku pemeliharaan kesehatan gigi dan mulut yang tidak memadai",
      "Nutrisi yang tidak memadai",
      "Faktor-faktor risiko yang dapat berubah dan tidak dapat diubah",
      "Penggunaan tembakau",
      "Penyakit sistemik yang tidak terkontrol (misal diabetes, HIV)",
      "Kurang melakukan pemeriksaan/perawatan gigi reguler"
    ],
    signs: [
      "Adanya lesi ekstraoral atau intraoral, nyeri jika ditekan, atau ada pembengkakan; peradangan gingiva",
      "Perdarahan saat probing; poket dalam atau kehilangan attachment > 4mm",
      "Terdapat xerostomia",
      "Manifestasi oral dari defisiensi nutrisi"
    ]
  },
  {
    title: "Tidak terpenuhinya kebutuhan terbebas dari nyeri pada kepala dan leher",
    causes: [
      "Ketidaknyamanan sendi rahang/Temporomandibular Joint (TMJ)",
      "Prosedur bedah mulut, prosedur tindakan medis gigi",
      "Penyakit gigi yang tidak diobati",
      "Akses yang tidak memadai ke fasilitas perawatan"
    ],
    signs: [
      "Rasa sakit atau sensitivitas ekstraoral atau intraoral sebelum perawatan",
      "Lunak pada palpasi ketika pemeriksaan ekstraoral atau intraoral",
      "Ketidaknyamanan selama perawatan kebersihan gigi"
    ]
  },
  {
    title: "Tidak terpenuhinya konseptualisasi dan pemecahan masalah",
    causes: [
      "Defisit pengetahuan",
      "Kurangnya pemaparan informasi"
    ],
    signs: [
      "Klien memiliki pertanyaan, kesalahpahaman, atau kurangnya pengetahuan",
      "Klien tidak memahami alasan untuk memelihara kesehatan gigi dan mulutnya sendiri",
      "Klien tidak memahami hubungan antara beberapa penyakit sistemik dan penyakit gigi dan mulut",
      "Klien salah menafsirkan informasi"
    ]
  },
  {
    title: "Tidak terpenuhinya tanggung jawab untuk kesehatan mulut",
    causes: [
      "Ketidakpatuhan atau ketidaktaatan",
      "Menggunakan alat bantu atau produk perawatan gigi dan mulut yang tidak tepat",
      "Perlu pengawasan orang tua",
      "Kurang mampu memelihara kesehatan gigi dan mulutnya sendiri",
      "Kurangnya keterampilan",
      "Gangguan fisik dan kemampuan kognitif",
      "Kekurangan sumber keuangan"
    ],
    signs: [
      "Kontrol plak yang tidak memadai",
      "Kurang pengawasan orang tua terhadap pemeliharaan kebersihan gigi",
      "Kurangnya pemantauan status kesehatan diri",
      "Tidak melakukan pemeriksaan gigi dalam 2 tahun terakhir"
    ]
  }
];
