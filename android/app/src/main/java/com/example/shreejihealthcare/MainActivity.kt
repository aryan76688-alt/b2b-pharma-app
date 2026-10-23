package com.example.shreejihealthcare

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.view.ViewGroup
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.delay

class WebAppInterface(private val mContext: Context) {
    @JavascriptInterface
    fun isAndroidApp(): Boolean = true

    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(mContext, message, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun triggerEmergencyCall(phoneNumber: String) {
        try {
            val cleanNumber = phoneNumber.replace(Regex("[^0-9+]"), "")
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    mContext,
                    android.Manifest.permission.CALL_PHONE
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$cleanNumber")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                mContext.startActivity(callIntent)
            } else {
                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$cleanNumber")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                mContext.startActivity(dialIntent)
            }
        } catch (e: Exception) {
            Toast.makeText(mContext, "Emergency call error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun triggerEmergencySOS() {
        triggerEmergencyCall("9924544283")
    }
}

class MainActivity : ComponentActivity() {

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* Location permissions handled */ }

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = filePathCallback ?: return@registerForActivityResult
        var results: Array<Uri>? = null
        if (result.resultCode == RESULT_OK && result.data != null) {
            val data = result.data
            val clipData = data?.clipData
            if (clipData != null) {
                val count = clipData.itemCount
                results = Array(count) { i -> clipData.getItemAt(i).uri }
            } else if (data?.data != null) {
                results = arrayOf(data.data!!)
            }
        }
        callback.onReceiveValue(results)
        filePathCallback = null
    }

    private fun startBackgroundService() {
        try {
            val serviceIntent = Intent(this, ShreejiBackgroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        startBackgroundService()

        // Auto request GPS location permissions for chemist geofencing and delivery tracking
        locationPermissionLauncher.launch(
            arrayOf(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )

        setContent {
            ShreejiAppRoot(
                onOpenFileChooser = { callback ->
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = callback
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                        putExtra(
                            Intent.EXTRA_MIME_TYPES,
                            arrayOf(
                                "application/vnd.ms-excel",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                "application/pdf",
                                "text/csv",
                                "*/*"
                            )
                        )
                    }
                    try {
                        fileChooserLauncher.launch(Intent.createChooser(intent, "Select Excel / PDF File"))
                        true
                    } catch (e: ActivityNotFoundException) {
                        filePathCallback = null
                        false
                    }
                }
            )
        }
    }
}

private const val CLOUDFLARE_WORKER_URL = "https://shreeji-order.aryan76688.workers.dev"
private const val LOCAL_TERMUX_URL = "http://127.0.0.1:3000"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ShreejiAppRoot(
    onOpenFileChooser: (ValueCallback<Array<Uri>>) -> Boolean = { false }
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("shreeji_prefs", Context.MODE_PRIVATE) }
    
    val savedUrl = prefs.getString("server_url", CLOUDFLARE_WORKER_URL) ?: CLOUDFLARE_WORKER_URL
    var currentUrl by remember { mutableStateOf(savedUrl) }
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var canGoBack by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var hasError by remember { mutableStateOf(false) }
    var retrySecondsLeft by remember { mutableIntStateOf(5) }
    var autoRetryActive by remember { mutableStateOf(true) }
    var showSettingsDialog by remember { mutableStateOf(false) }
    var inputUrl by remember { mutableStateOf(currentUrl) }

    // Intercept hardware/gesture back press to navigate WebView back
    BackHandler(enabled = canGoBack) {
        webViewInstance?.goBack()
    }

    // Auto-reconnect countdown timer when an error or server recycle happens
    LaunchedEffect(hasError, autoRetryActive, currentUrl) {
        if (hasError && autoRetryActive) {
            retrySecondsLeft = 5
            while (retrySecondsLeft > 0 && hasError && autoRetryActive) {
                delay(1000L)
                retrySecondsLeft -= 1
            }
            if (hasError && autoRetryActive) {
                hasError = false
                isLoading = true
                webViewInstance?.loadUrl(currentUrl)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF5F8FC))
            .systemBarsPadding()
    ) {
        // Android WebView container
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        loadWithOverviewMode = true
                        useWideViewPort = true
                        builtInZoomControls = false
                        displayZoomControls = false
                        cacheMode = WebSettings.LOAD_DEFAULT
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        setGeolocationEnabled(true)
                    }

                    addJavascriptInterface(WebAppInterface(ctx), "AndroidBridge")
                    addJavascriptInterface(WebAppInterface(ctx), "AndroidApp")

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                            isLoading = true
                            hasError = false
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isLoading = false
                            canGoBack = view?.canGoBack() ?: false
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            super.onReceivedError(view, request, error)
                            if (request?.isForMainFrame == true) {
                                isLoading = false
                                hasError = true
                                autoRetryActive = true
                            }
                        }

                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                            val url = request?.url?.toString() ?: return false
                            if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:") ||
                                url.startsWith("upi:") || url.startsWith("phonepe:") || url.startsWith("tez:") || url.startsWith("paytmmp:") ||
                                url.startsWith("https://wa.me/") || url.contains("api.whatsapp.com")) {
                                return try {
                                    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                    true
                                } catch (_: Exception) {
                                    false
                                }
                            }
                            return false
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            if (newProgress >= 90) {
                                isLoading = false
                            }
                            canGoBack = view?.canGoBack() ?: false
                        }

                        override fun onGeolocationPermissionsShowPrompt(
                            origin: String?,
                            callback: GeolocationPermissions.Callback?
                        ) {
                            callback?.invoke(origin, true, false)
                        }

                        override fun onShowFileChooser(
                            view: WebView?,
                            filePathCallback: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?
                        ): Boolean {
                            return if (filePathCallback != null) {
                                onOpenFileChooser(filePathCallback)
                            } else {
                                false
                            }
                        }
                    }

                    loadUrl(currentUrl)
                    webViewInstance = this
                }
            },
            update = { wv ->
                webViewInstance = wv
            }
        )

        // Loading overlay
        if (isLoading && !hasError) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = 0.85f)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.shreeji_logo),
                        contentDescription = "Shreeji Healthcare Logo",
                        modifier = Modifier
                            .size(160.dp)
                            .clip(RoundedCornerShape(16.dp))
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    CircularProgressIndicator(
                        color = Color(0xFF0B63CE),
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Connecting to Shreeji Healthcare...",
                        color = Color(0xFF555555),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // Connection Error / Offline Screen with 24/7 Resilience & Auto-Reconnect
        if (hasError) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF8FAFC))
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.shreeji_logo),
                            contentDescription = "Shreeji Healthcare",
                            modifier = Modifier.size(110.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "SHREEJI HEALTHCARE",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF0B63CE)
                        )
                        Text(
                            text = "A UNIT OF SHREEJI 7",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFE51A24)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Server Reconnecting...",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        Text(
                            text = if (retrySecondsLeft > 0) "Auto-reconnecting in $retrySecondsLeft seconds..." else "Connecting...",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF0B63CE)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Active: $currentUrl",
                            fontSize = 10.sp,
                            color = Color(0xFF64748B),
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        // Quick Connection Switch Buttons
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    hasError = false
                                    isLoading = true
                                    autoRetryActive = true
                                    webViewInstance?.loadUrl(currentUrl)
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B63CE))
                            ) {
                                Text("🔄 Retry Now", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedButton(
                                    onClick = {
                                        currentUrl = LOCAL_TERMUX_URL
                                        prefs.edit().putString("server_url", LOCAL_TERMUX_URL).apply()
                                        hasError = false
                                        isLoading = true
                                        webViewInstance?.loadUrl(LOCAL_TERMUX_URL)
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp)
                                ) {
                                    Text("📱 Local Termux", fontSize = 11.sp, maxLines = 1)
                                }

                                OutlinedButton(
                                    onClick = {
                                        currentUrl = CLOUDFLARE_WORKER_URL
                                        prefs.edit().putString("server_url", CLOUDFLARE_WORKER_URL).apply()
                                        hasError = false
                                        isLoading = true
                                        webViewInstance?.loadUrl(CLOUDFLARE_WORKER_URL)
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp)
                                ) {
                                    Text("☁️ Cloudflare", fontSize = 11.sp, maxLines = 1)
                                }
                            }

                            TextButton(
                                onClick = {
                                    inputUrl = currentUrl
                                    showSettingsDialog = true
                                },
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            ) {
                                Text("⚙️ Change Custom URL", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                        }
                    }
                }
            }
        }
    }

    // Server URL configuration dialog
    if (showSettingsDialog) {
        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = {
                Text(
                    text = "Server Endpoint",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column {
                    Text(
                        text = "Enter server host URL:",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = inputUrl,
                        onValueChange = { inputUrl = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "• Local Termux: http://127.0.0.1:3000\n• Cloudflare: $CLOUDFLARE_WORKER_URL",
                        fontSize = 10.sp,
                        color = Color(0xFF94A3B8)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val clean = inputUrl.trim()
                        if (clean.isNotEmpty()) {
                            prefs.edit().putString("server_url", clean).apply()
                            currentUrl = clean
                            hasError = false
                            isLoading = true
                            webViewInstance?.loadUrl(clean)
                        }
                        showSettingsDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B63CE))
                ) {
                    Text("Connect")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettingsDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

