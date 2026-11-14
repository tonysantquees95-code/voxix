package tech.vetorial.voxix;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import android.view.View;
import com.getcapacitor.BridgeActivity;

/** Mantém o Voxix ENTRE as barras do Android (status em cima, navegação embaixo), fixas ou não, e acima do teclado. */
public class MainActivity extends BridgeActivity {
    private static final int FUNDO = Color.parseColor("#05070D");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        WindowCompat.setDecorFitsSystemWindows(w, false);
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);
        w.getDecorView().setBackgroundColor(FUNDO);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
        c.setAppearanceLightStatusBars(false);     // ícones claros sobre o fundo escuro
        c.setAppearanceLightNavigationBars(false);

        final View raiz = findViewById(android.R.id.content);
        raiz.setBackgroundColor(FUNDO);
        // Barras de cima e de baixo (e o teclado) viram margem: nada fica escondido atrás delas, em qualquer versão do Android.
        ViewCompat.setOnApplyWindowInsetsListener(raiz, (v, insets) -> {
            Insets barras = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets teclado = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(barras.left, barras.top, barras.right, Math.max(barras.bottom, teclado.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(raiz);
    }
}
