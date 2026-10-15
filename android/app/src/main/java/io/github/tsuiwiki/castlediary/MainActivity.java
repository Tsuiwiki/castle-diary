package io.github.tsuiwiki.castlediary;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrintPlugin.class); // 本地插件要在 super.onCreate 之前注册
        super.onCreate(savedInstanceState);
    }
}
