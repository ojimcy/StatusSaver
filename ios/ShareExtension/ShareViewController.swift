import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    let appGroupId = "group.com.statusvault.shared"

    override func isContentValid() -> Bool {
        return true
    }

    override func didSelectPost() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }

        let group = DispatchGroup()

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    handleMedia(attachment: attachment, type: "image") {
                        group.leave()
                    }
                } else if attachment.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
                    group.enter()
                    handleMedia(attachment: attachment, type: "video") {
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    private func handleMedia(attachment: NSItemProvider, type: String, completion: @escaping () -> Void) {
        let typeIdentifier = type == "image" ? UTType.image.identifier : UTType.movie.identifier

        attachment.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { [weak self] (data, error) in
            guard let self = self else { completion(); return }

            if let url = data as? URL {
                self.saveToSharedContainer(url: url, type: type)
            } else if let image = data as? UIImage, let imageData = image.jpegData(compressionQuality: 0.9) {
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
                try? imageData.write(to: tempURL)
                self.saveToSharedContainer(url: tempURL, type: type)
            }
            completion()
        }
    }

    private func saveToSharedContainer(url: URL, type: String) {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return }

        let sharedDir = containerURL.appendingPathComponent("SharedMedia")
        try? FileManager.default.createDirectory(at: sharedDir, withIntermediateDirectories: true)

        let fileExtension = url.pathExtension.isEmpty ? (type == "image" ? "jpg" : "mp4") : url.pathExtension
        let filename = "\(Int(Date().timeIntervalSince1970 * 1000))_\(UUID().uuidString).\(fileExtension)"
        let destURL = sharedDir.appendingPathComponent(filename)

        try? FileManager.default.copyItem(at: url, to: destURL)

        // Write metadata
        let metadata: [String: Any] = [
            "filename": filename,
            "type": type,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000),
            "path": destURL.path
        ]

        let metadataURL = sharedDir.appendingPathComponent("\(filename).json")
        if let jsonData = try? JSONSerialization.data(withJSONObject: metadata) {
            try? jsonData.write(to: metadataURL)
        }
    }

    override func configurationItems() -> [Any]! {
        return []
    }
}
