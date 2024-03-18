!macro customInstall
    WriteRegDWORD HKCU "SOFTWARE\Blizzard Entertainment\Warcraft III" "Allow Local Files" 0x00000001
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Warcraft III" "InstallLocation"
    ${if} $0 == ""
        ReadRegStr $1 HKLM "SOFTWARE\WOW6432Node\Blizzard Entertainment\Warcraft III\Capabilities" "ApplicationIcon"
        StrCpy $0 $1 -36 1
    ${EndIf}
    ${if} $0 == ""
        MessageBox MB_OK "Failed to get Warcraft III install location. You will not be able to connect to the webui."
    ${EndIf}
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
    CopyFiles /SILENT "$INSTDIR\index.js" "$0\_retail_\webui\index.js"
    Delete "$INSTDIR\webui.html"
    Delete "$INSTDIR\webuiPerf.html"
    Delete "$INSTDIR\index.js"
!macroend

!macro customUnInstall
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Warcraft III" "InstallLocation"
    DeleteRegValue HKCU "SOFTWARE\Blizzard Entertainment\Warcraft III" "Allow Local Files"
    DeleteRegKey /ifempty HKCU "SOFTWARE\Blizzard Entertainment\Warcraft III"
    Delete "$0\_retail_\webui\index.html"
    Delete "$0\_retail_\webui\index.js"
    Delete "$0\_retail_\webui\indexPerf.js"
 !macroend