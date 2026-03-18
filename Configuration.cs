using Dalamud.Configuration;

namespace ChatAnywhere;

[Serializable]
public class Configuration : IPluginConfiguration
{
    public int Version { get; set; } = 1;

    public bool WebinterfaceEnabled { get; set; } = true;
    public int WebinterfacePort { get; set; } = 3000;
    public string WebinterfacePassword { get; set; } = "";
    
    // Tokens for active sessions
    public List<string> AuthStore { get; set; } = [];
}
