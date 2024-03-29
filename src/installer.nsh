!macro customInstall
    WriteRegDWORD HKCU "SOFTWARE\Blizzard Entertainment\Warcraft III" "Allow Local Files" 0x00000001
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Warcraft III" "InstallLocation"
    ${If} ${FileExists} "$0\_retail_\webui\*.*"
        ; file exists
    ${Else}
        CreateDirectory "$0\_retail_\webui"
    ${EndIf}
    ${If} ${FileExists} "$INSTDIR\warInstallLoc.txt"
        ; file exists
    ${Else}
        FileOpen $1 "$INSTDIR\warInstallLoc.txt" w
        FileWrite $1 "$0"
        FileClose $1
    ${EndIf}
    CopyFiles /SILENT "$INSTDIR\webui.html" "$0\_retail_\webui\index.html"
    CopyFiles /SILENT "$INSTDIR\webuiPerf.html" "$0\_retail_\webui\indexPerf.html"
    CopyFiles /SILENT "$INSTDIR\webui.js" "$0\_retail_\webui\index.js"
    Delete "$INSTDIR\webui.html"
    Delete "$INSTDIR\webuiPerf.html"
    Delete "$INSTDIR\webui.js"
!macroend

!macro customUnInstall
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Warcraft III" "InstallLocation"
    DeleteRegValue HKCU "SOFTWARE\Blizzard Entertainment\Warcraft III" "Allow Local Files"
    DeleteRegKey /ifempty HKCU "SOFTWARE\Blizzard Entertainment\Warcraft III"
    Delete "$0\_retail_\webui\index.html"
    Delete "$0\_retail_\webui\index.js"
    Delete "$0\_retail_\webui\indexPerf.js"
 !macroend