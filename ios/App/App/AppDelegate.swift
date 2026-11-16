import UIKit
import Capacitor
import AuthenticationServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool { true }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

class LoccalViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LoccalAuthPlugin())
        webView?.allowsBackForwardNavigationGestures = true
    }
}

@objc(LoccalAuthPlugin)
public class LoccalAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "LoccalAuthPlugin"
    public let jsName = "LoccalAuth"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)]
    private var authSession: ASWebAuthenticationSession?

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard self.authSession == nil else { call.reject("Sign-in is already open."); return }
            guard let raw = call.getString("url"), let url = URL(string: raw),
                  let current = self.bridge?.webView?.url,
                  url.scheme == current.scheme, url.host == current.host, url.port == current.port,
                  url.path == "/mobile/sign-in", self.bridge?.viewController?.view.window != nil else {
                call.reject("Invalid sign-in request.")
                return
            }
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "loccal") { [weak self] callback, error in
                DispatchQueue.main.async {
                    self?.authSession = nil
                    guard error == nil, let callback, callback.scheme == "loccal", callback.host == "auth",
                          let parts = URLComponents(url: callback, resolvingAgainstBaseURL: false),
                          let ticket = parts.queryItems?.first(where: { $0.name == "ticket" })?.value,
                          !ticket.isEmpty else {
                        call.reject("Sign-in was cancelled or could not finish.")
                        return
                    }
                    call.resolve(["ticket": ticket])
                }
            }
            session.presentationContextProvider = self
            self.authSession = session
            if !session.start() {
                self.authSession = nil
                call.reject("Sign-in could not open. Please try again.")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
