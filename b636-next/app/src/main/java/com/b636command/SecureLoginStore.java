package com.b636command;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Opt-in at-rest encryption for router credentials. The AES key is nonexportable
 * inside Android Keystore; prefs contain only a fresh 12-byte nonce and AES-GCM
 * ciphertext. Nothing is stored or logged in plaintext.
 */
final class SecureLoginStore {
    private static final String ALIAS="B636CommandRouterLoginV1";
    private static final String PREF="b636_secure_login";
    private static final String IV="iv",DATA="data";
    private static final int VERSION=1;
    private final SharedPreferences prefs;
    SecureLoginStore(Context context){
        prefs=context.getApplicationContext().getSharedPreferences(PREF,Context.MODE_PRIVATE);
    }
    static final class Credentials {
        final String address,username,password;
        Credentials(String a,String u,String p){address=a;username=u;password=p;}
    }
    boolean hasLogin(){return prefs.contains(IV)&&prefs.contains(DATA);}
    private SecretKey key()throws Exception{
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if(ks.containsAlias(ALIAS)){
            KeyStore.Entry entry=ks.getEntry(ALIAS,null);
            if(entry instanceof KeyStore.SecretKeyEntry)
                return ((KeyStore.SecretKeyEntry)entry).getSecretKey();
            throw new IllegalStateException("Invalid Android Keystore login key");
        }
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
            KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }
    void save(String address,String username,String password)throws Exception{
        if(address.isEmpty()||username.isEmpty()||password.isEmpty())
            throw new IllegalArgumentException("Missing router credentials");
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        DataOutputStream data=new DataOutputStream(bytes);
        data.writeInt(VERSION);
        data.writeUTF(address);
        data.writeUTF(username);
        data.writeUTF(password);
        data.flush();
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,key());
        byte[] encrypted=cipher.doFinal(bytes.toByteArray());
        boolean saved=prefs.edit()
            .putString(IV,Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP))
            .putString(DATA,Base64.encodeToString(encrypted,Base64.NO_WRAP))
            .commit();
        if(!saved)throw new IOException("Couldn't save encrypted login");
    }
    Credentials load()throws Exception{
        String iv=prefs.getString(IV,null),body=prefs.getString(DATA,null);
        if(iv==null||body==null)return null;
        byte[] nonce=Base64.decode(iv,Base64.NO_WRAP);
        byte[] ciphertext=Base64.decode(body,Base64.NO_WRAP);
        if(nonce.length!=12 || ciphertext.length<17 || ciphertext.length>4096)
            throw new IllegalStateException("Stored login is invalid");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,nonce));
        byte[] clear=cipher.doFinal(ciphertext);
        DataInputStream in=new DataInputStream(new ByteArrayInputStream(clear));
        if(in.readInt()!=VERSION)throw new IllegalStateException("Saved login version is unsupported");
        String address=in.readUTF(),username=in.readUTF(),password=in.readUTF();
        java.util.Arrays.fill(clear,(byte)0);
        return new Credentials(address,username,password);
    }
    void clear(){
        prefs.edit().remove(IV).remove(DATA).commit();
        try{
            KeyStore ks=KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            if(ks.containsAlias(ALIAS))ks.deleteEntry(ALIAS);
        }catch(Exception ignored){}
    }
}
