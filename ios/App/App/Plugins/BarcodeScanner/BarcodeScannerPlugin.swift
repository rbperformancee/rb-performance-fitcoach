// BarcodeScannerPlugin.swift
// RB Perform — Scanner code-barre LIVE (style Yuka/MyFitnessPal)
//
// AVFoundation (built-in iOS depuis iOS 7) — détection EAN/UPC/Code128/Code39
// en temps réel, sans photo intermédiaire.
//
// UX :
//   - Overlay 4 corners (style Apple Wallet / Camera) + ligne de scan animée
//   - Bouton torche (auto-hidden si device sans flash)
//   - Confirmation visuelle (checkmark + flash vert) avant dismiss
//   - Tap-to-focus / haptic feedback à la détection
//
// API JS :
//   await BarcodeScanner.scanLive()
//   → { rawValue: "3017624010701", format: "ean13" }
//   → { rawValue: "", cancelled: true }
//
// Le plugin est enregistré dans MyBridgeViewController.capacitorDidLoad().

import Foundation
import Capacitor
import AVFoundation
import UIKit

@objc(BarcodeScannerPlugin)
public class BarcodeScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BarcodeScannerPlugin"
    public let jsName = "BarcodeScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanLive", returnType: CAPPluginReturnPromise),
    ]

    private var scannerVC: BarcodeScannerViewController?

    @objc func scanLive(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized:
                self.presentScanner(call)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        if granted { self.presentScanner(call) }
                        else { call.reject("Camera permission denied") }
                    }
                }
            case .denied, .restricted:
                call.reject("Camera permission denied. Please enable in Settings.")
            @unknown default:
                call.reject("Unknown camera permission state")
            }
        }
    }

    private func presentScanner(_ call: CAPPluginCall) {
        guard let presenter = self.bridge?.viewController else {
            call.reject("No presenting view controller")
            return
        }
        let vc = BarcodeScannerViewController()
        vc.onScanned = { [weak self] result in
            DispatchQueue.main.async {
                presenter.dismiss(animated: true) {
                    self?.scannerVC = nil
                    switch result {
                    case .success(let (value, format)):
                        call.resolve(["rawValue": value, "format": format])
                    case .failure(let err):
                        call.reject(err.localizedDescription)
                    case .cancelled:
                        call.resolve(["rawValue": "", "format": "", "cancelled": true])
                    }
                }
            }
        }
        vc.modalPresentationStyle = .fullScreen
        self.scannerVC = vc
        presenter.present(vc, animated: true)
    }
}

// MARK: - Scanner View Controller

enum ScanResult {
    case success((value: String, format: String))
    case failure(Error)
    case cancelled
}

final class BarcodeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onScanned: ((ScanResult) -> Void)?

    // Couleur d'accent (teal RB Perform)
    private let accent = UIColor(red: 0.008, green: 0.82, blue: 0.73, alpha: 1)

    // Capture
    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var videoDevice: AVCaptureDevice?
    private var didEmit = false

    // Overlay
    private var scanLine: CALayer?
    private var torchButton: UIButton?
    private var successOverlay: UIView?
    private var cadreRect: CGRect = .zero

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupSession()
        setupOverlayUI()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.layer.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if !session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.session.startRunning()
                DispatchQueue.main.async { self?.startScanLineAnimation() }
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning { session.stopRunning() }
        // Éteint la torche à la fermeture pour éviter qu'elle reste allumée
        setTorch(on: false)
    }

    // MARK: - Capture setup

    private func setupSession() {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            onScanned?(.failure(NSError(domain: "BarcodeScanner", code: -1, userInfo: [NSLocalizedDescriptionKey: "No camera available"])))
            return
        }
        videoDevice = device
        do {
            let input = try AVCaptureDeviceInput(device: device)
            if session.canAddInput(input) { session.addInput(input) }
            let metaOutput = AVCaptureMetadataOutput()
            if session.canAddOutput(metaOutput) {
                session.addOutput(metaOutput)
                metaOutput.setMetadataObjectsDelegate(self, queue: .main)
                metaOutput.metadataObjectTypes = [.ean13, .ean8, .upce, .code128, .code39]
            }
            let preview = AVCaptureVideoPreviewLayer(session: session)
            preview.videoGravity = .resizeAspectFill
            preview.frame = view.layer.bounds
            view.layer.addSublayer(preview)
            self.previewLayer = preview
        } catch {
            onScanned?(.failure(error))
        }
    }

    // MARK: - Overlay (style Apple)

    private func setupOverlayUI() {
        // 1) Cadre central — calcul des dimensions
        let cadreWidth: CGFloat = min(view.bounds.width - 80, 320)
        let cadreHeight: CGFloat = cadreWidth * 0.62  // ratio code-barre
        let cadreX = (view.bounds.width - cadreWidth) / 2
        let cadreY = (view.bounds.height - cadreHeight) / 2 - 30
        let rect = CGRect(x: cadreX, y: cadreY, width: cadreWidth, height: cadreHeight)
        self.cadreRect = rect

        // 2) Overlay sombre avec trou découpé
        let overlay = UIView(frame: view.bounds)
        overlay.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        overlay.isUserInteractionEnabled = false
        view.addSubview(overlay)

        let path = UIBezierPath(rect: view.bounds)
        path.append(UIBezierPath(roundedRect: rect, cornerRadius: 18).reversing())
        let mask = CAShapeLayer()
        mask.path = path.cgPath
        overlay.layer.mask = mask

        // 3) Corners "L" (style Apple Wallet / iOS Camera QR)
        let cornerLen: CGFloat = 28
        let cornerThick: CGFloat = 4
        addCornerBrackets(rect: rect, length: cornerLen, thickness: cornerThick, color: accent)

        // 4) Ligne de scan animée (horizontale, balaye verticalement)
        let line = CALayer()
        line.frame = CGRect(x: rect.minX + 10, y: rect.minY + 4, width: rect.width - 20, height: 2)
        line.backgroundColor = accent.cgColor
        line.shadowColor = accent.cgColor
        line.shadowOpacity = 0.9
        line.shadowRadius = 6
        line.shadowOffset = .zero
        view.layer.addSublayer(line)
        self.scanLine = line

        // 5) Titre + hint
        let title = UILabel()
        title.text = "Scanner un produit"
        title.textColor = .white
        title.font = .systemFont(ofSize: 17, weight: .semibold)
        title.textAlignment = .center
        title.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(title)
        NSLayoutConstraint.activate([
            title.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            title.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
        ])

        let hint = UILabel()
        hint.text = "Centre le code-barres dans le cadre"
        hint.textColor = UIColor.white.withAlphaComponent(0.7)
        hint.font = .systemFont(ofSize: 13, weight: .regular)
        hint.textAlignment = .center
        hint.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hint)
        NSLayoutConstraint.activate([
            hint.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            hint.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 6),
        ])

        // 6) Bouton torche (auto-hidden si pas dispo)
        let torch = UIButton(type: .system)
        torch.translatesAutoresizingMaskIntoConstraints = false
        torch.tintColor = .white
        torch.backgroundColor = UIColor.white.withAlphaComponent(0.12)
        torch.layer.cornerRadius = 22
        torch.setImage(UIImage(systemName: "bolt.slash.fill"), for: .normal)
        torch.addTarget(self, action: #selector(toggleTorch), for: .touchUpInside)
        view.addSubview(torch)
        NSLayoutConstraint.activate([
            torch.widthAnchor.constraint(equalToConstant: 44),
            torch.heightAnchor.constraint(equalToConstant: 44),
            torch.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            torch.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
        ])
        torch.isHidden = !(videoDevice?.hasTorch ?? false)
        self.torchButton = torch

        // 7) Bouton fermer
        let close = UIButton(type: .system)
        close.setTitle("Annuler", for: .normal)
        close.setTitleColor(.white, for: .normal)
        close.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        close.backgroundColor = UIColor.white.withAlphaComponent(0.15)
        close.layer.cornerRadius = 24
        close.translatesAutoresizingMaskIntoConstraints = false
        close.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        view.addSubview(close)
        NSLayoutConstraint.activate([
            close.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            close.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -32),
            close.widthAnchor.constraint(equalToConstant: 160),
            close.heightAnchor.constraint(equalToConstant: 48),
        ])

        // 8) Tap-to-focus (sauf sur les boutons)
        let tap = UITapGestureRecognizer(target: self, action: #selector(tapToFocus(_:)))
        view.addGestureRecognizer(tap)
    }

    private func addCornerBrackets(rect: CGRect, length: CGFloat, thickness: CGFloat, color: UIColor) {
        // 4 corners : top-left, top-right, bottom-left, bottom-right
        // Chaque corner = 2 traits perpendiculaires de longueur `length`.
        let positions: [(x: CGFloat, y: CGFloat, hMult: CGFloat, vMult: CGFloat)] = [
            // (cornerX, cornerY, horizontal dir +1/-1, vertical dir +1/-1)
            (rect.minX, rect.minY, 1, 1),   // top-left
            (rect.maxX, rect.minY, -1, 1),  // top-right
            (rect.minX, rect.maxY, 1, -1),  // bottom-left
            (rect.maxX, rect.maxY, -1, -1), // bottom-right
        ]
        for p in positions {
            let h = CALayer()
            h.frame = CGRect(
                x: p.hMult > 0 ? p.x : p.x - length,
                y: p.vMult > 0 ? p.y : p.y - thickness,
                width: length, height: thickness
            )
            h.backgroundColor = color.cgColor
            h.cornerRadius = thickness / 2
            view.layer.addSublayer(h)

            let v = CALayer()
            v.frame = CGRect(
                x: p.hMult > 0 ? p.x : p.x - thickness,
                y: p.vMult > 0 ? p.y : p.y - length,
                width: thickness, height: length
            )
            v.backgroundColor = color.cgColor
            v.cornerRadius = thickness / 2
            view.layer.addSublayer(v)
        }
    }

    private func startScanLineAnimation() {
        guard let line = scanLine else { return }
        let topY = cadreRect.minY + 4
        let botY = cadreRect.maxY - 6
        line.removeAllAnimations()
        line.position = CGPoint(x: line.position.x, y: topY)

        let anim = CABasicAnimation(keyPath: "position.y")
        anim.fromValue = topY
        anim.toValue = botY
        anim.duration = 1.6
        anim.autoreverses = true
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        line.add(anim, forKey: "scanLine")
    }

    // MARK: - Torch

    @objc private func toggleTorch() {
        guard let device = videoDevice, device.hasTorch else { return }
        let willBeOn = device.torchMode != .on
        setTorch(on: willBeOn)
        torchButton?.setImage(
            UIImage(systemName: willBeOn ? "bolt.fill" : "bolt.slash.fill"),
            for: .normal
        )
        torchButton?.backgroundColor = willBeOn
            ? accent.withAlphaComponent(0.85)
            : UIColor.white.withAlphaComponent(0.12)
        torchButton?.tintColor = willBeOn ? .black : .white
    }

    private func setTorch(on: Bool) {
        guard let device = videoDevice, device.hasTorch else { return }
        do {
            try device.lockForConfiguration()
            device.torchMode = on ? .on : .off
            device.unlockForConfiguration()
        } catch {
            // ignore
        }
    }

    // MARK: - Tap to focus

    @objc private func tapToFocus(_ gr: UITapGestureRecognizer) {
        let point = gr.location(in: view)
        // Ignore les taps sur les boutons (déjà gérés par leurs targets)
        if let torch = torchButton, torch.frame.contains(point) { return }
        guard let device = videoDevice, let preview = previewLayer else { return }
        let devicePoint = preview.captureDevicePointConverted(fromLayerPoint: point)
        do {
            try device.lockForConfiguration()
            if device.isFocusPointOfInterestSupported && device.isFocusModeSupported(.autoFocus) {
                device.focusPointOfInterest = devicePoint
                device.focusMode = .autoFocus
            }
            if device.isExposurePointOfInterestSupported && device.isExposureModeSupported(.autoExpose) {
                device.exposurePointOfInterest = devicePoint
                device.exposureMode = .autoExpose
            }
            device.unlockForConfiguration()
            // Petit indicateur visuel
            showFocusRing(at: point)
        } catch {
            // ignore
        }
    }

    private func showFocusRing(at point: CGPoint) {
        let ring = UIView(frame: CGRect(x: point.x - 30, y: point.y - 30, width: 60, height: 60))
        ring.layer.borderColor = UIColor.white.withAlphaComponent(0.85).cgColor
        ring.layer.borderWidth = 1.2
        ring.layer.cornerRadius = 30
        ring.isUserInteractionEnabled = false
        view.addSubview(ring)
        ring.alpha = 0
        ring.transform = CGAffineTransform(scaleX: 1.3, y: 1.3)
        UIView.animate(withDuration: 0.18, animations: {
            ring.alpha = 1
            ring.transform = .identity
        }) { _ in
            UIView.animate(withDuration: 0.4, delay: 0.25, options: [], animations: {
                ring.alpha = 0
            }) { _ in ring.removeFromSuperview() }
        }
    }

    @objc private func cancelTapped() {
        onScanned?(.cancelled)
    }

    // MARK: - Detection + success animation

    func metadataOutput(_ output: AVCaptureMetadataOutput,
                       didOutput metadataObjects: [AVMetadataObject],
                       from connection: AVCaptureConnection) {
        guard !didEmit,
              let meta = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = meta.stringValue else { return }
        didEmit = true

        // Haptic
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)

        // Pause capture
        session.stopRunning()
        scanLine?.removeAllAnimations()
        scanLine?.isHidden = true

        // Calcul du format string
        let format = meta.type.rawValue
            .replacingOccurrences(of: "org.gs1.", with: "")
            .replacingOccurrences(of: "org.iso.", with: "")
            .replacingOccurrences(of: "PDF417", with: "pdf417")

        // Confirmation visuelle : flash vert + checkmark + valeur
        showSuccessOverlay(value: value) { [weak self] in
            self?.onScanned?(.success((value: value, format: format)))
        }
    }

    private func showSuccessOverlay(value: String, completion: @escaping () -> Void) {
        let container = UIView(frame: cadreRect)
        container.backgroundColor = accent.withAlphaComponent(0.18)
        container.layer.cornerRadius = 18
        container.layer.borderColor = accent.cgColor
        container.layer.borderWidth = 3
        container.alpha = 0
        view.addSubview(container)
        self.successOverlay = container

        let check = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
        check.tintColor = accent
        check.contentMode = .scaleAspectFit
        check.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(check)
        NSLayoutConstraint.activate([
            check.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            check.centerYAnchor.constraint(equalTo: container.centerYAnchor, constant: -10),
            check.widthAnchor.constraint(equalToConstant: 56),
            check.heightAnchor.constraint(equalToConstant: 56),
        ])

        let codeLabel = UILabel()
        codeLabel.text = value
        codeLabel.textColor = .white
        codeLabel.font = .systemFont(ofSize: 14, weight: .semibold)
        codeLabel.textAlignment = .center
        codeLabel.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(codeLabel)
        NSLayoutConstraint.activate([
            codeLabel.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            codeLabel.topAnchor.constraint(equalTo: check.bottomAnchor, constant: 6),
        ])

        UIView.animate(withDuration: 0.18, animations: {
            container.alpha = 1
        }) { _ in
            // 480ms à l'écran pour que l'utilisateur enregistre le succès
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.48) {
                completion()
            }
        }
    }
}
