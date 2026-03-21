package io.github.datakore.chronoid;

public class ChronoidException extends RuntimeException {
    public ChronoidException(String message) {
        super(message);
    }

    public static class InvalidId extends ChronoidException {
        public InvalidId(String message) {
            super(message);
        }
    }

    public static class ParseError extends ChronoidException {
        public ParseError(String message) {
            super(message);
        }
    }

    public static class SequenceExhausted extends ChronoidException {
        public SequenceExhausted() {
            super("Sequence exhausted for current millisecond");
        }
    }
}
