export interface BuiltinLevel {
  id: string;
  name: string;
  filename: string;
  category: string;
}

export const builtinLevels: BuiltinLevel[] = [
  // TTC levels
  { id: "ttc101", name: "TTC 101", filename: "TTC101.lev", category: "TTC" },
  { id: "ttc102", name: "TTC 102", filename: "TTC102.lev", category: "TTC" },
  { id: "ttc103", name: "TTC 103", filename: "TTC103.lev", category: "TTC" },
  { id: "ttc104", name: "TTC 104", filename: "TTC104.lev", category: "TTC" },
  { id: "ttc105", name: "TTC 105", filename: "TTC105.lev", category: "TTC" },
  { id: "ttc106", name: "TTC 106", filename: "TTC106.lev", category: "TTC" },
  { id: "ttc107", name: "TTC 107", filename: "TTC107.lev", category: "TTC" },
  { id: "ttc108", name: "TTC 108", filename: "TTC108.lev", category: "TTC" },
  { id: "ttc109", name: "TTC 109", filename: "TTC109.lev", category: "TTC" },
  { id: "ttc110", name: "TTC 110", filename: "TTC110.lev", category: "TTC" },
  
  // QWQUU levels
  { id: "qwquu001", name: "QWQUU 001", filename: "QWQUU001.lev", category: "QWQUU" },
  { id: "qwquu002", name: "QWQUU 002", filename: "QWQUU002.lev", category: "QWQUU" },
  { id: "qwquu003", name: "QWQUU 003", filename: "QWQUU003.lev", category: "QWQUU" },
  { id: "qwquu004", name: "QWQUU 004", filename: "QWQUU004.lev", category: "QWQUU" },
  { id: "qwquu005", name: "QWQUU 005", filename: "QWQUU005.lev", category: "QWQUU" },
  { id: "qwquu006", name: "QWQUU 006", filename: "QWQUU006.lev", category: "QWQUU" },
  { id: "qwquu007", name: "QWQUU 007", filename: "QWQUU007.lev", category: "QWQUU" },
  { id: "qwquu008", name: "QWQUU 008", filename: "QWQUU008.lev", category: "QWQUU" },
  { id: "qwquu009", name: "QWQUU 009", filename: "QWQUU009.lev", category: "QWQUU" },
  { id: "qwquu010", name: "QWQUU 010", filename: "QWQUU010.lev", category: "QWQUU" },
  { id: "qwquu011", name: "QWQUU 011", filename: "QWQUU011.lev", category: "QWQUU" },
  { id: "qwquu012", name: "QWQUU 012", filename: "QWQUU012.lev", category: "QWQUU" },
  { id: "qwquu013", name: "QWQUU 013", filename: "QWQUU013.lev", category: "QWQUU" },
  { id: "qwquu014", name: "QWQUU 014", filename: "QWQUU014.lev", category: "QWQUU" },
  { id: "qwquu015", name: "QWQUU 015", filename: "QWQUU015.lev", category: "QWQUU" },
  { id: "qwquu016", name: "QWQUU 016", filename: "QWQUU016.lev", category: "QWQUU" },
  { id: "qwquu017", name: "QWQUU 017", filename: "QWQUU017.lev", category: "QWQUU" },
  { id: "qwquu018", name: "QWQUU 018", filename: "QWQUU018.lev", category: "QWQUU" },
  { id: "qwquu019", name: "QWQUU 019", filename: "QWQUU019.lev", category: "QWQUU" },
  { id: "qwquu020", name: "QWQUU 020", filename: "QWQUU020.lev", category: "QWQUU" },
  { id: "qwquu021", name: "QWQUU 021", filename: "QWQUU021.lev", category: "QWQUU" },
  { id: "qwquu022", name: "QWQUU 022", filename: "QWQUU022.lev", category: "QWQUU" },
  { id: "qwquu023", name: "QWQUU 023", filename: "QWQUU023.lev", category: "QWQUU" },
  { id: "qwquu024", name: "QWQUU 024", filename: "QWQUU024.lev", category: "QWQUU" },
  { id: "qwquu025", name: "QWQUU 025", filename: "QWQUU025.lev", category: "QWQUU" },
  { id: "qwquu026", name: "QWQUU 026", filename: "QWQUU026.lev", category: "QWQUU" },
  { id: "qwquu027", name: "QWQUU 027", filename: "QWQUU027.lev", category: "QWQUU" },
  { id: "qwquu028", name: "QWQUU 028", filename: "QWQUU028.lev", category: "QWQUU" },
  { id: "qwquu029", name: "QWQUU 029", filename: "QWQUU029.lev", category: "QWQUU" },
  { id: "qwquu030", name: "QWQUU 030", filename: "QWQUU030.lev", category: "QWQUU" },
  { id: "qwquu031", name: "QWQUU 031", filename: "QWQUU031.lev", category: "QWQUU" },
  { id: "qwquu032", name: "QWQUU 032", filename: "QWQUU032.lev", category: "QWQUU" },
  { id: "qwquu033", name: "QWQUU 033", filename: "QWQUU033.lev", category: "QWQUU" },
  { id: "qwquu034", name: "QWQUU 034", filename: "QWQUU034.lev", category: "QWQUU" },
  { id: "qwquu035", name: "QWQUU 035", filename: "QWQUU035.lev", category: "QWQUU" },
  { id: "qwquu036", name: "QWQUU 036", filename: "QWQUU036.lev", category: "QWQUU" },
  { id: "qwquu037", name: "QWQUU 037", filename: "QWQUU037.lev", category: "QWQUU" },
  { id: "qwquu038", name: "QWQUU 038", filename: "QWQUU038.lev", category: "QWQUU" },
  { id: "qwquu039", name: "QWQUU 039", filename: "QWQUU039.lev", category: "QWQUU" },
  { id: "qwquu040", name: "QWQUU 040", filename: "QWQUU040.lev", category: "QWQUU" },
  { id: "qwquu041", name: "QWQUU 041", filename: "QWQUU041.lev", category: "QWQUU" },
  { id: "qwquu042", name: "QWQUU 042", filename: "QWQUU042.lev", category: "QWQUU" },
  { id: "qwquu043", name: "QWQUU 043", filename: "QWQUU043.lev", category: "QWQUU" },
  { id: "qwquu044", name: "QWQUU 044", filename: "QWQUU044.lev", category: "QWQUU" },
  { id: "qwquu045", name: "QWQUU 045", filename: "QWQUU045.lev", category: "QWQUU" },
  { id: "qwquu046", name: "QWQUU 046", filename: "QWQUU046.lev", category: "QWQUU" },
  { id: "qwquu047", name: "QWQUU 047", filename: "QWQUU047.lev", category: "QWQUU" },
  { id: "qwquu048", name: "QWQUU 048", filename: "QWQUU048.lev", category: "QWQUU" },
  { id: "qwquu049", name: "QWQUU 049", filename: "QWQUU049.lev", category: "QWQUU" },
  { id: "qwquu050", name: "QWQUU 050", filename: "QWQUU050.lev", category: "QWQUU" },
  { id: "qwquu051", name: "QWQUU 051", filename: "QWQUU051.lev", category: "QWQUU" },
  { id: "qwquu052", name: "QWQUU 052", filename: "QWQUU052.lev", category: "QWQUU" },
  { id: "qwquu053", name: "QWQUU 053", filename: "QWQUU053.lev", category: "QWQUU" },
  { id: "qwquu054", name: "QWQUU 054", filename: "QWQUU054.lev", category: "QWQUU" },
  
  // Pipo levels
  { id: "pipo017", name: "Pipo 017", filename: "Pipo017.lev", category: "Pipo" },
  { id: "pipo018", name: "Pipo 018", filename: "Pipo018.lev", category: "Pipo" },
  { id: "pipo019", name: "Pipo 019", filename: "Pipo019.lev", category: "Pipo" },
  { id: "pipo020", name: "Pipo 020", filename: "Pipo020.lev", category: "Pipo" },
  { id: "pipo021", name: "Pipo 021", filename: "Pipo021.lev", category: "Pipo" },
  { id: "pipo022", name: "Pipo 022", filename: "Pipo022.lev", category: "Pipo" },
  { id: "pipo023", name: "Pipo 023", filename: "Pipo023.lev", category: "Pipo" },
  { id: "pipo024", name: "Pipo 024", filename: "Pipo024.lev", category: "Pipo" },
  { id: "pipo025", name: "Pipo 025", filename: "Pipo025.lev", category: "Pipo" },
  { id: "pipo026", name: "Pipo 026", filename: "Pipo026.lev", category: "Pipo" },
  { id: "pipo027", name: "Pipo 027", filename: "Pipo027.lev", category: "Pipo" },
  { id: "pipo028", name: "Pipo 028", filename: "Pipo028.lev", category: "Pipo" },
  { id: "pipo029", name: "Pipo 029", filename: "Pipo029.lev", category: "Pipo" },
  { id: "pipo030", name: "Pipo 030", filename: "Pipo030.lev", category: "Pipo" },
  { id: "pipo031", name: "Pipo 031", filename: "Pipo031.lev", category: "Pipo" },
  { id: "pipo032", name: "Pipo 032", filename: "Pipo032.lev", category: "Pipo" },
  { id: "pipo033", name: "Pipo 033", filename: "Pipo033.lev", category: "Pipo" },
  { id: "pipo034", name: "Pipo 034", filename: "Pipo034.lev", category: "Pipo" },
  { id: "pipo035", name: "Pipo 035", filename: "Pipo035.lev", category: "Pipo" },
  { id: "pipo036", name: "Pipo 036", filename: "Pipo036.lev", category: "Pipo" },
  { id: "pipo037", name: "Pipo 037", filename: "Pipo037.lev", category: "Pipo" },
  { id: "pipo038", name: "Pipo 038", filename: "Pipo038.lev", category: "Pipo" },
  { id: "pipo039", name: "Pipo 039", filename: "Pipo039.lev", category: "Pipo" },
  { id: "pipo040", name: "Pipo 040", filename: "Pipo040.lev", category: "Pipo" },
  { id: "pipo041", name: "Pipo 041", filename: "Pipo041.lev", category: "Pipo" },
  { id: "pipo042", name: "Pipo 042", filename: "Pipo042.lev", category: "Pipo" },
  { id: "pipo043", name: "Pipo 043", filename: "Pipo043.lev", category: "Pipo" },
  { id: "pipo044", name: "Pipo 044", filename: "Pipo044.lev", category: "Pipo" },
  { id: "pipo045", name: "Pipo 045", filename: "Pipo045.lev", category: "Pipo" },
  { id: "pipo046", name: "Pipo 046", filename: "Pipo046.lev", category: "Pipo" },
  { id: "pipo047", name: "Pipo 047", filename: "Pipo047.lev", category: "Pipo" },
  { id: "pipo048", name: "Pipo 048", filename: "Pipo048.lev", category: "Pipo" },
  { id: "pipo049", name: "Pipo 049", filename: "Pipo049.lev", category: "Pipo" },
  { id: "pipo050", name: "Pipo 050", filename: "Pipo050.lev", category: "Pipo" },
  { id: "pipo051", name: "Pipo 051", filename: "Pipo051.lev", category: "Pipo" },
  { id: "pipo052", name: "Pipo 052", filename: "Pipo052.lev", category: "Pipo" },
];

export const getLevelsByCategory = () => {
  const categories: Record<string, BuiltinLevel[]> = {};
  builtinLevels.forEach(level => {
    if (!categories[level.category]) {
      categories[level.category] = [];
    }
    categories[level.category].push(level);
  });
  return categories;
}; 