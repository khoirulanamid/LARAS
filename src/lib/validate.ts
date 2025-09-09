export function validateFolkloreRoster(full: any, messages: string[]){
  try {
    const title = String(full?.title || full?.meta?.title || '').toLowerCase();
    const rosterIds = new Set((full?.roster||[]).map((r:any)=>String(r?.id||'').toLowerCase()));
    if (title.includes('malin') && title.includes('kundang')){
      if (!rosterIds.has('malin_kundang')) messages.push('Roster wajib memiliki "malin_kundang".');
      if (!rosterIds.has('ibu_malin')) messages.push('Roster wajib memiliki "ibu_malin".');
    }
  } catch {}
}