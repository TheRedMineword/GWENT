STRNG_base = deepClone(STRNG);
window.show_translation_warn = function(){
    var json = getTranslation("_info");
    if (!json.translated){
    warn_screen(json.msg.replace("%s", getTranslation("TRANSLATED_BY")), "alert", json.tit);
}
}
buildNotificationTranslations();
console.log("STRNG_base", STRNG_base)