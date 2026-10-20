package io.github.tsuiwiki.castlediary.media

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

/**
 * 录音（「她说」用）：MediaRecorder 写 m4a；调用方持有 MediaRecorder 权限（RECORD_AUDIO 已声明）。
 * 简单封装：start 返回输出文件，stop 返回文件路径，cancel 清理残留。
 */
class AudioRecorder(private val context: Context) {
    private val outDir = File(context.filesDir, "media/audio").apply { mkdirs() }
    private var recorder: MediaRecorder? = null
    private var outFile: File? = null

    fun start(): File {
        cancel()
        val f = File(outDir, "rec-${System.currentTimeMillis()}.m4a")
        outFile = f
        recorder = if (Build.VERSION.SDK_INT >= 31) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }.apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioSamplingRate(44100)
            setAudioEncodingBitRate(96000)
            setOutputFile(f.absolutePath)
            prepare()
            start()
        }
        return f
    }

    fun stop(): File? {
        val r = recorder ?: return null
        try { r.stop() } catch (_: RuntimeException) { }
        r.release()
        recorder = null
        return outFile?.takeIf { it.exists() && it.length() > 0 }
    }

    fun cancel() {
        recorder?.let { try { it.stop() } catch (_: RuntimeException) {} ; it.release() }
        recorder = null
        outFile?.delete()
        outFile = null
    }
}
