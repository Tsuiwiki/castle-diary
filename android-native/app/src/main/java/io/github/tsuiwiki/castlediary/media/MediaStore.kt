package io.github.tsuiwiki.castlediary.media

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

/**
 * 媒体存储（M3）：照片/录音写入应用私有目录，返回相对路径；SHA-256 用于导入完整性校验。
 * 规则（任务书 1.4）：不依赖临时 URI；写入失败不静默；删除前查引用（DAO 层 mediaDao.refCount）。
 */
class MediaStore(private val context: Context) {

    private val rootDir: File
        get() = File(context.filesDir, "media").apply { if (!exists()) mkdirs() }

    /**
     * 把一段字节写入私有目录，返回相对路径（如 images/2026-10-20/xxx.jpg）。
     * 内容相同时返回已存在文件路径（幂等，防重复导入膨胀）。
     */
    suspend fun save(
        id: String,
        kind: Kind,
        bytes: ByteArray,
        mimeType: String,
    ): Stored = withContext(Dispatchers.IO) {
        val sha256 = bytes.sha256Hex()
        val ext = extFor(mimeType)
        val rel = "${kind.dirName}/${id}.$ext"
        val file = File(rootDir, rel)
        file.parentFile?.mkdirs()
        if (!file.exists() || file.length() != bytes.size.toLong()) {
            FileOutputStream(file).use { it.write(bytes) }
        }
        Stored(relativePath = rel, sha256 = sha256, sizeBytes = bytes.size.toLong())
    }

    fun resolve(relativePath: String): File = File(rootDir, relativePath)

    /** 删除物理文件（调用方需先确认无引用） */
    fun delete(relativePath: String): Boolean {
        val f = File(rootDir, relativePath)
        return if (f.exists()) f.delete() else true
    }

    enum class Kind(val dirName: String) { IMAGE("images"), AUDIO("audio") }

    data class Stored(val relativePath: String, val sha256: String, val sizeBytes: Long)

    private fun extFor(mime: String): String = when {
        mime.contains("jpeg") || mime.contains("jpg") -> "jpg"
        mime.contains("png") -> "png"
        mime.contains("webp") -> "webp"
        mime.contains("webm") -> "webm"
        mime.contains("ogg") -> "ogg"
        mime.contains("m4a") || mime.contains("mp4") -> "m4a"
        else -> "bin"
    }

    private fun ByteArray.sha256Hex(): String =
        MessageDigest.getInstance("SHA-256").digest(this)
            .joinToString("") { "%02x".format(it) }
}
